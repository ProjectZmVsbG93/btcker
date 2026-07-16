import pandas as pd
from datetime import datetime
import time
import requests

def fetch_kabutan_data(code, start_date):
    """株探(Kabutan)から過去データを取得する"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    all_data = []
    page = 1
    
    while True:
        url = f"https://kabutan.jp/stock/kabuka?code={code}&ashi=day&page={page}"
        print(f"Fetching {url}...")
        res = requests.get(url, headers=headers)
        
        try:
            # HTML内のテーブルを取得
            tables = pd.read_html(res.text)
            
            # 履歴テーブルは通常ページ内のいくつか目のテーブル。
            # 日付が入っているテーブルを探す
            df = None
            for tbl in tables:
                if '日付' in tbl.columns and '終値' in tbl.columns:
                    df = tbl
                    break
                    
            if df is None or df.empty:
                break
                
            # 「日付」列を文字列として処理
            df['日付'] = df['日付'].astype(str)
            # 株探の日付は "26/07/16" などのフォーマット（YY/MM/DD）
            # 年が2桁なので、2000年を足して YYYY/MM/DD に変換
            def fix_date(d):
                if len(d) == 8: # e.g. 26/07/16
                    return "20" + d
                return d
                
            df['日付'] = df['日付'].apply(fix_date)
            df['日付'] = pd.to_datetime(df['日付'], format='%Y/%m/%d', errors='coerce')
            
            # 無効な日付行を除外
            df = df.dropna(subset=['日付'])
            
            all_data.append(df)
            
            # start_date より古いデータに到達したらループ終了
            oldest_date = df['日付'].min()
            if oldest_date < pd.to_datetime(start_date):
                break
                
        except Exception as e:
            print(f"Error parsing page {page}: {e}")
            break
            
        page += 1
        time.sleep(1) # サーバー負荷軽減のため1秒待機
        
    if not all_data:
        return pd.DataFrame()
        
    combined = pd.concat(all_data, ignore_index=True)
    
    # 日付でフィルタリング
    combined = combined[combined['日付'] >= pd.to_datetime(start_date)]
    
    # 必要な列だけ抽出
    combined = combined.set_index('日付')
    # 終値列のデータクレンジング (カンマ削除や数値変換)
    close_prices = combined['終値'].astype(str).str.replace(',', '')
    # 文字列になっている可能性があるため、数値に変換
    close_prices = pd.to_numeric(close_prices, errors='coerce')
    
    # 日付昇順に並び替え
    close_prices = close_prices.sort_index()
    
    return close_prices

def main():
    # 6月最初の営業日
    start_date = "2026-06-01"
    
    # 日経平均は 0000, TOPIXは 0010
    print("日経平均 (現物) を取得中...")
    nk_close = fetch_kabutan_data("0000", start_date)
    
    print("TOPIX (現物) を取得中...")
    topix_close = fetch_kabutan_data("0010", start_date)
    
    # データを結合
    df_result = pd.DataFrame({
        'Nikkei225': nk_close,
        'TOPIX': topix_close
    })
    
    # 日付フォーマットの調整
    df_result.index = df_result.index.strftime('%Y/%m/%d')
    
    # CSVに出力
    output_file = "nk_topix_close.csv"
    df_result.to_csv(output_file, encoding='utf-8-sig')
    
    print(f"\nSuccess! Saved to {output_file}")
    print(df_result.tail())

if __name__ == "__main__":
    main()
