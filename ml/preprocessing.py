import pandas as pd

def load_and_clean_data(path):
    df = pd.read_csv(path)

    # Convert date
    df['date'] = pd.to_datetime(df['date'])

    # Remove nulls
    df = df.dropna()

    # Remove invalid values
    df = df[df['quantity'] > 0]

    return df


def feature_engineering(df):

    # Sort by date
    df = df.sort_values('date')

    # Moving average
    df['moving_avg'] = df['quantity'].rolling(window=3).mean()

    # Consumption (difference)
    df['consumption'] = df['quantity'].diff()

    # Fill nulls
    df = df.fillna(0)

    return df
