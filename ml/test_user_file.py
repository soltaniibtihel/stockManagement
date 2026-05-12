import pandas as pd
import os
import sys

# Adding the ml directory to path to import local modules
sys.path.append(os.getcwd())

from preprocessing import load_and_clean_data, feature_engineering

def test_user_file():
    # 1. Create a dummy CSV with the user's exact columns and delimiter
    headers = "Code article;Ligne prod.;Date;Liaison;ID;Desc Art;Type trans;Ecart qté emp.;Adresse;Nom;Ref;Lot;N° expédition;Site;Emplac.;Date validité;cout de revient;Tot amt;Lot/Série;Solde;Facture;Ordre;Trans;Programme;Unité de mesure;Code mouvement stock;Type article;TYPE ARTICLE;heure;QTE rejetée OF;Centre de charges;ID utilisateur;Nom utilisateur;Menu"
    
    # 6 rows to pass the len > 5 check
    rows = [
        headers,
        "A1;L1;01/01/2023;L;1;Desc;T;-10;A;N;R;L;N;S;E;D;C;T;L;S;F;O;T;P;U;C;T;T;H;Q;C;I;N;M",
        "A1;L1;02/01/2023;L;2;Desc;T;20,50;A;N;R;L;N;S;E;D;C;T;L;S;F;O;T;P;U;C;T;T;H;Q;C;I;N;M",
        "A1;L1;03/01/2023;L;3;Desc;T;-5.5;A;N;R;L;N;S;E;D;C;T;L;S;F;O;T;P;U;C;T;T;H;Q;C;I;N;M",
        "A1;L1;04/01/2023;L;4;Desc;T; - 100 ;A;N;R;L;N;S;E;D;C;T;L;S;F;O;T;P;U;C;T;T;H;Q;C;I;N;M",
        "A1;L1;05/01/2023;L;5;Desc;T;150;A;N;R;L;N;S;E;D;C;T;L;S;F;O;T;P;U;C;T;T;H;Q;C;I;N;M",
        "A1;L1;06/01/2023;L;6;Desc;T;20;A;N;R;L;N;S;E;D;C;T;L;S;F;O;T;P;U;C;T;T;H;Q;C;I;N;M",
    ]
    
    csv_path = 'data/test_user_file.csv'
    os.makedirs('data', exist_ok=True)
    with open(csv_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(rows))
    
    print("Created test file 'test_user_file.csv'.")
    
    try:
        # Load and clean
        df = load_and_clean_data(csv_path)
        print(f"Post cleaning:\n{df.head(10)}")
        
        # Feature Engineering
        df = feature_engineering(df)
        print(f"Post feature engineering:\n{df.head(10)}")
        
        from sklearn.model_selection import train_test_split
        features = ['moving_avg', 'consumption', 'lag_1', 'day_of_week', 'month', 'is_weekend', 'is_month_end', 'rolling_std']
        X = df[features]
        y = df['quantity']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)
        print(f"Split successful: Train size={len(X_train)}, Test size={len(X_test)}")
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    test_user_file()
