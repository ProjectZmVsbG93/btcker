# whatif_simulation.R
options(stringsAsFactors = FALSE)

# 1. データの読み込み
df <- read.csv("data.csv", fileEncoding="utf-8")
if (!("時間" %in% names(df)) && !("Time" %in% names(df))) {
  df <- read.csv("data.csv") # Try default encoding (e.g. Shift-JIS)
}

# カラム名が文字化けした場合に備え、インデックスで名前を固定
# 1:日付, 2:時間, 3:始値, 4:高値, 5:安値, 6:終値, 7:出来高
names(df)[1:7] <- c("Date", "Time", "Open", "High", "Low", "Close", "Volume")

# 日付と時間をパース
df$DateTime <- as.POSIXct(paste(df$Date, df$Time), format="%Y/%m/%d %H:%M")
# NAの除去と並び替え
df <- df[!is.na(df$DateTime), ]
df <- df[order(df$DateTime), ]
rownames(df) <- NULL

# 2. ベーストレードの抽出 (20:00 エントリー, 次の 19:00 エグジット)
trades <- list()

for (i in 1:(nrow(df) - 1)) {
  if (df$Time[i] == "20:00") {
    entry_idx <- i
    exit_idx <- NA
    
    # 次の 19:00 を探す
    for (j in (i + 1):nrow(df)) {
      if (df$Time[j] == "19:00") {
        exit_idx <- j
        break
      }
    }
    
    if (!is.na(exit_idx)) {
      trades[[length(trades) + 1]] <- list(
        entry_idx = entry_idx,
        exit_idx = exit_idx,
        entry_price = as.numeric(df$Open[entry_idx]),
        exit_price_time = as.numeric(df$Open[exit_idx])
      )
    }
  }
}

cat(sprintf("抽出されたトレード数: %d\n", length(trades)))
if (length(trades) == 0) {
  stop("トレードが1つも見つかりませんでした。Timeカラムのフォーマットを確認してください。")
}

# 3. 各トレードの区間データを事前計算
for (t in seq_along(trades)) {
  idx_start <- trades[[t]]$entry_idx
  idx_end <- trades[[t]]$exit_idx
  
  # startIndex から exitIndex - 1 までの 高値/安値
  trades[[t]]$highs <- as.numeric(df$High[idx_start:(idx_end - 1)])
  trades[[t]]$lows <- as.numeric(df$Low[idx_start:(idx_end - 1)])
}

# 4. シミュレーションエンジンの定義
simulate_whatif <- function(trades, position, pattern, tp, sl, trail_act, trail_rev, be_act, be_moveto) {
  pnl_list <- numeric(length(trades))
  
  for (i in seq_along(trades)) {
    tr <- trades[[i]]
    entry_price <- tr$entry_price
    highs <- tr$highs
    lows <- tr$lows
    default_exit_price <- tr$exit_price_time
    
    triggered <- FALSE
    sim_exit_price <- default_exit_price
    
    max_profit_price <- entry_price
    trailing_active <- FALSE
    be_active <- FALSE
    
    for (k in seq_along(highs)) {
      h <- highs[k]
      l <- lows[k]
      
      if (pattern == "fixed") {
        if (position == "Long") {
          is_tp <- (h >= entry_price + tp)
          is_sl <- (l <= entry_price - sl)
          if (is_tp && is_sl) {
            sim_exit_price <- entry_price - sl
            triggered <- TRUE; break
          } else if (is_sl) {
            sim_exit_price <- entry_price - sl
            triggered <- TRUE; break
          } else if (is_tp) {
            sim_exit_price <- entry_price + tp
            triggered <- TRUE; break
          }
        } else {
          is_tp <- (l <= entry_price - tp)
          is_sl <- (h >= entry_price + sl)
          if (is_tp && is_sl) {
            sim_exit_price <- entry_price + sl
            triggered <- TRUE; break
          } else if (is_sl) {
            sim_exit_price <- entry_price + sl
            triggered <- TRUE; break
          } else if (is_tp) {
            sim_exit_price <- entry_price - tp
            triggered <- TRUE; break
          }
        }
      } else if (pattern == "trailing") {
        if (position == "Long") {
          if (h > max_profit_price) max_profit_price <- h
          curr_profit <- max_profit_price - entry_price
          if (!trailing_active && curr_profit >= trail_act) {
            trailing_active <- TRUE
          }
          if (trailing_active) {
            stop_price <- max_profit_price - trail_rev
            if (l <= stop_price) {
              sim_exit_price <- stop_price
              triggered <- TRUE; break
            }
          }
        } else {
          if (l < max_profit_price) max_profit_price <- l
          curr_profit <- entry_price - max_profit_price
          if (!trailing_active && curr_profit >= trail_act) {
            trailing_active <- TRUE
          }
          if (trailing_active) {
            stop_price <- max_profit_price + trail_rev
            if (h >= stop_price) {
              sim_exit_price <- stop_price
              triggered <- TRUE; break
            }
          }
        }
      } else if (pattern == "breakeven") {
        if (position == "Long") {
          if (!be_active && h >= entry_price + be_act) {
            be_active <- TRUE
          }
          if (be_active) {
            stop_price <- entry_price + be_moveto
            if (l <= stop_price) {
              sim_exit_price <- stop_price
              triggered <- TRUE; break
            }
          }
        } else {
          if (!be_active && l <= entry_price - be_act) {
            be_active <- TRUE
          }
          if (be_active) {
            stop_price <- entry_price - be_moveto
            if (h >= stop_price) {
              sim_exit_price <- stop_price
              triggered <- TRUE; break
            }
          }
        }
      }
    }
    
    if (position == "Long") {
      pnl <- sim_exit_price - entry_price
    } else {
      pnl <- entry_price - sim_exit_price
    }
    pnl_list[i] <- pnl
  }
  
  return(pnl_list)
}

# 5. グリッドサーチ (網羅的シミュレーション)
positions <- c("Long", "Short")
patterns <- c("fixed", "trailing", "breakeven", "none")
tp_sl_seq <- seq(100, 1000, by=100)

results <- list()
cat("シミュレーションを実行中...\n")

for (pos in positions) {
  # none (WhatIfなし、時間決済のみ)
  pnl <- simulate_whatif(trades, pos, "none", 0, 0, 0, 0, 0, 0)
  results[[length(results)+1]] <- data.frame(
    Position=pos, Pattern="none", TP=NA, SL=NA, TrailAct=NA, TrailRev=NA, BeAct=NA, BeMoveTo=NA,
    TotalTrades=length(pnl), Wins=sum(pnl>0), GrossProfit=sum(pnl[pnl>0]), GrossLoss=sum(abs(pnl[pnl<0])),
    PnL_list=I(list(pnl))
  )
  
  # fixed
  for (tp in tp_sl_seq) {
    for (sl in tp_sl_seq) {
      pnl <- simulate_whatif(trades, pos, "fixed", tp, sl, 0, 0, 0, 0)
      results[[length(results)+1]] <- data.frame(
        Position=pos, Pattern="fixed", TP=tp, SL=sl, TrailAct=NA, TrailRev=NA, BeAct=NA, BeMoveTo=NA,
        TotalTrades=length(pnl), Wins=sum(pnl>0), GrossProfit=sum(pnl[pnl>0]), GrossLoss=sum(abs(pnl[pnl<0])),
        PnL_list=I(list(pnl))
      )
    }
  }
  
  # trailing
  for (act in seq(100, 1000, by=100)) {
    for (rev in seq(50, 500, by=50)) {
      if (rev < act) {
        pnl <- simulate_whatif(trades, pos, "trailing", 0, 0, act, rev, 0, 0)
        results[[length(results)+1]] <- data.frame(
          Position=pos, Pattern="trailing", TP=NA, SL=NA, TrailAct=act, TrailRev=rev, BeAct=NA, BeMoveTo=NA,
          TotalTrades=length(pnl), Wins=sum(pnl>0), GrossProfit=sum(pnl[pnl>0]), GrossLoss=sum(abs(pnl[pnl<0])),
          PnL_list=I(list(pnl))
        )
      }
    }
  }
  
  # breakeven
  for (act in seq(100, 1000, by=100)) {
    for (moveto in c(0, 10, 20, 50)) {
      if (moveto < act) {
        pnl <- simulate_whatif(trades, pos, "breakeven", 0, 0, 0, 0, act, moveto)
        results[[length(results)+1]] <- data.frame(
          Position=pos, Pattern="breakeven", TP=NA, SL=NA, TrailAct=NA, TrailRev=NA, BeAct=act, BeMoveTo=moveto,
          TotalTrades=length(pnl), Wins=sum(pnl>0), GrossProfit=sum(pnl[pnl>0]), GrossLoss=sum(abs(pnl[pnl<0])),
          PnL_list=I(list(pnl))
        )
      }
    }
  }
}

res_df <- do.call(rbind, results)

# 統計量の計算
calculate_stats <- function(row) {
  pnl <- unlist(row$PnL_list)
  trades_count <- length(pnl)
  wins <- sum(pnl > 0)
  win_rate <- if(trades_count > 0) wins / trades_count else 0
  
  gross_profit <- sum(pnl[pnl > 0])
  gross_loss <- sum(abs(pnl[pnl < 0]))
  net_profit <- gross_profit - gross_loss
  
  profit_factor <- if(gross_loss == 0) Inf else gross_profit / gross_loss
  
  avg_pnl <- if(trades_count > 0) net_profit / trades_count else 0
  sd_pnl <- sd(pnl)
  if (is.na(sd_pnl) || sd_pnl == 0) {
    sharpe <- 0
  } else {
    sharpe <- avg_pnl / sd_pnl
  }
  
  # Max Drawdown
  cum_eq <- cumsum(pnl)
  peak <- cummax(cum_eq)
  drawdown <- peak - cum_eq
  max_dd <- max(drawdown)
  
  data.frame(
    WinRate = win_rate,
    NetProfit = net_profit,
    AvgPnL = avg_pnl,
    ProfitFactor = profit_factor,
    SharpeRatio = sharpe,
    MaxDrawdown = max_dd
  )
}

stats_list <- lapply(1:nrow(res_df), function(i) calculate_stats(res_df[i,]))
stats_df <- do.call(rbind, stats_list)

final_res <- cbind(res_df[, setdiff(names(res_df), c("PnL_list", "Wins", "GrossProfit", "GrossLoss"))], stats_df)

# ランキング: シャープレシオ降順
final_res <- final_res[order(-final_res$SharpeRatio), ]

write.csv(final_res, "strategy_ranking.csv", row.names = FALSE)
cat("strategy_ranking.csv に出力しました。トップ5:\n")
print(head(final_res[, c("Position", "Pattern", "TP", "SL", "NetProfit", "WinRate", "SharpeRatio")], 5))
