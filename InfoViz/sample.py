import pandas as pd

def count_unique_students(file_path, year):
    # Load the dataset
    df = pd.read_csv(file_path)
    
    # Filter data for the given year
    df_year = df[df["year"] == year]
    
    # Count unique students based on Roll No and Rank
    unique_roll_nos = df_year["Roll No"].nunique()
    unique_ranks = df_year["Rank"].nunique()
    
    return unique_roll_nos, unique_ranks

if __name__ == "__main__":
    file_path = "combined_data.csv"  # Change this to the actual file path
    year = int(input("Enter the year: "))
    
    unique_roll_nos, unique_ranks = count_unique_students(file_path, year)
    
    print(f"Number of unique students in {year} by Roll No: {unique_roll_nos}")
    print(f"Number of unique students in {year} by Rank: {unique_ranks}")