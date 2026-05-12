import pandas as pd
import os
import sys

# Adding the ml directory to path to import local modules
sys.path.append(os.getcwd())

from preprocessing import load_and_clean_data, feature_engineering

def test_repro():
    # 1. Create a dummy CSV with 5 rows
    data = {
        'date': ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
        'quantity': [10, 20, 15, 25, 30]
    }
    df_raw = pd.DataFrame(data)
    csv_path = 'data/test_repro.csv'
    os.makedirs('data', exist_ok=True)
    df_raw.to_csv(csv_path, index=False)
    
    print(f"Created test file with {len(df_raw)} rows.")
    
    try:
        # Load and clean
        df = load_and_clean_data(csv_path)
        print(f"Post cleaning: {len(df)} rows.")
        
        # Feature Engineering
        df = feature_engineering(df)
        print(f"Post feature engineering: {len(df)} rows.")
        
        if len(df) < 2:
             print("CRITICAL: Dataframe too small after feature engineering!")
             
        from sklearn.model_selection import train_test_split
        features = ['moving_avg', 'consumption', 'lag_1', 'day_of_week', 'month', 'is_weekend', 'is_month_end', 'rolling_std']
        X = df[features]
        y = df['quantity']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)
        print(f"Split successful: Train size={len(X_train)}, Test size={len(X_test)}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    test_repro()
