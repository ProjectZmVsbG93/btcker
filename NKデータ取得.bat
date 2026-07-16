@echo off
setlocal enabledelayedexpansion

set /p period="取得期間を入力してください (例: 5d, 1mo, 1y): "

:: 入力が 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max のいずれかを含むか判定
echo %period% | findstr /i "mo y max" > nul

if %errorlevel% equ 0 (
    :: 1ヶ月以上の場合：CSVファイルとして出力
    echo 1ヶ月以上のデータのため、CSVファイルを出力します...
    python -c "import yfinance as yf; yf.Ticker('^N225').history(period='%period%').to_csv('nikkei_data.csv')"
    echo [完了] nikkei_data.csv に保存しました。
) else (
    :: 1ヶ月未満の場合：画面に表を表示し、JSONをクリップボードにコピー
    echo 1ヶ月未満のデータのため、表を表示してJSONをコピーします...
    
    :: 画面表示用の表（目視用）
    python -c "import yfinance as yf; print(yf.Ticker('^N225').history(period='%period%'))"
    
    :: クリップボードコピー用のJSON（AI用）
    python -c "import yfinance as yf; print(yf.Ticker('^N225').history(period='%period%').to_json(orient='index'))" | clip
    
    echo.
    echo --------------------------------------------------
    echo [完了] JSONデータをクリップボードにコピーしました。
)

echo.
pause