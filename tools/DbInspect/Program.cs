using Microsoft.Data.Sqlite;

var dbPath = @"C:\Users\Lukeb\Downloads\Mission11_Bennion\Bookstore.sqlite";
if (!File.Exists(dbPath))
{
    Console.WriteLine($"DB not found at: {dbPath}");
    return;
}

using var connection = new SqliteConnection($"Data Source={dbPath};");
connection.Open();

using var tablesCmd = connection.CreateCommand();
tablesCmd.CommandText = @"
SELECT name
FROM sqlite_master
WHERE type='table'
  AND name NOT LIKE 'sqlite_%'
ORDER BY name;";

using var tablesReader = tablesCmd.ExecuteReader();
var tableNames = new List<string>();
while (tablesReader.Read())
{
    tableNames.Add(tablesReader.GetString(0));
}

Console.WriteLine("Tables:");
foreach (var table in tableNames)
{
    Console.WriteLine($"- {table}");

    using var pragmaCmd = connection.CreateCommand();
    pragmaCmd.CommandText = $"PRAGMA table_info('{table}');";
    using var pragmaReader = pragmaCmd.ExecuteReader();

    Console.WriteLine("  Columns:");
    while (pragmaReader.Read())
    {
        // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        var colName = pragmaReader.GetString(1);
        var colType = pragmaReader.IsDBNull(2) ? "" : pragmaReader.GetString(2);
        var isPk = !pragmaReader.IsDBNull(5) && pragmaReader.GetInt32(5) == 1;
        Console.WriteLine($"    - {colName} : {colType}{(isPk ? " (PK)" : "")}");
    }
}
