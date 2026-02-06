# Foodsy Backend Scripts

This directory contains utility scripts for managing the Foodsy backend application.

## Restaurant Cache Population Scripts

Two equivalent scripts are provided to populate the restaurant cache with data from the Google Places API:

### 1. Bash Script: `populate-restaurant-cache.sh`

**Requirements:**
- Bash shell (macOS, Linux, WSL on Windows)
- `curl` command
- Optional: `jq` for better JSON parsing

**Usage:**
```bash
# Make executable (if not already)
chmod +x populate-restaurant-cache.sh

# Populate all boroughs
./populate-restaurant-cache.sh

# Populate specific borough with stats
./populate-restaurant-cache.sh -b Manhattan -s

# Use local backend with trending updates
./populate-restaurant-cache.sh -u http://localhost:8080 -t -s

# Dry run to see what would happen
./populate-restaurant-cache.sh --dry-run
```

### 2. Python Script: `populate-restaurant-cache.py`

**Requirements:**
- Python 3.6+ (no additional packages needed)

**Usage:**
```bash
# Make executable (if not already)
chmod +x populate-restaurant-cache.py

# Populate all boroughs
./populate-restaurant-cache.py

# Populate specific borough with stats
./populate-restaurant-cache.py -b Manhattan -s

# Use local backend with trending updates
./populate-restaurant-cache.py -u http://localhost:8080 -t -s

# Dry run to see what would happen
./populate-restaurant-cache.py --dry-run
```

## Common Options

Both scripts support the same command-line options:

| Option | Description | Default |
|--------|-------------|---------|
| `-h, --help` | Show help message | - |
| `-u, --url URL` | Backend URL | `https://apifoodsy-backend.com` |
| `-b, --borough BOROUGH` | Populate only specific borough | All boroughs |
| `-r, --retry COUNT` | Number of retries for failed requests | 3 |
| `-d, --delay SECONDS` | Delay between retries | 5 |
| `-s, --stats` | Show cache statistics after population | False |
| `-t, --trending` | Update trending scores after population | False |
| `--dry-run` | Show what would be done without making requests | False |

## Valid Boroughs

- Manhattan
- Brooklyn
- Queens
- Bronx

## Example Workflows

### 1. Initial Setup (First Time)
```bash
# Populate all boroughs and update trending scores
./populate-restaurant-cache.sh -s -t
```

### 2. Weekly Refresh
```bash
# Refresh all data and update trending scores
./populate-restaurant-cache.sh -t
```

### 3. Test Specific Borough
```bash
# Test Manhattan only with detailed output
./populate-restaurant-cache.sh -b Manhattan -s -t
```

### 4. Development Testing
```bash
# Test with local backend
./populate-restaurant-cache.sh -u http://localhost:8080 --dry-run
```

## Expected Output

### Successful Run:
```
=======================================
Foodsy Restaurant Cache Population Tool
=======================================

[INFO] Backend URL: https://apifoodsy-backend.com
[INFO] Retry count: 3
[INFO] Retry delay: 5s

[INFO] Starting restaurant cache population...
[INFO] Processing borough: Manhattan
[INFO] Attempt 1/3: Refreshing Manhattan restaurant data
[SUCCESS] Refreshing Manhattan restaurant data completed successfully
[SUCCESS] Successfully populated restaurant cache for Manhattan
  - Restaurants refreshed: 25
  - Time taken: 2341ms

[INFO] Processing borough: Brooklyn
[INFO] Attempt 1/3: Refreshing Brooklyn restaurant data
[SUCCESS] Refreshing Brooklyn restaurant data completed successfully
[SUCCESS] Successfully populated restaurant cache for Brooklyn
  - Restaurants refreshed: 18
  - Time taken: 1876ms

...

=======================================
[INFO] Population Summary:
[SUCCESS] Successful: 4/4 boroughs
[SUCCESS] All boroughs populated successfully!

[SUCCESS] Restaurant cache population completed!
[INFO] Your dashboard should now show restaurant recommendations.
[INFO] Visit your Foodsy dashboard to see the results!
```

## Troubleshooting

### Authentication Errors (HTTP 401/302)
- The API requires authentication
- Contact your backend administrator for access
- Check if anonymous access is enabled for these endpoints

### Network Errors
- Check your internet connection
- Verify the backend URL is correct
- Try with `--retry` increased count

### Rate Limiting
- Use `--delay` to increase time between retries
- Run with specific borough first to test: `-b Manhattan`

### No Data Populated
- Check backend logs for Google Places API quota
- Verify API keys are configured correctly
- Ensure database is accessible

## Script Features

- **Robust Error Handling**: Automatic retries with exponential backoff
- **Colored Output**: Easy-to-read colored terminal output
- **Progress Tracking**: Real-time feedback on population progress
- **Flexible Options**: Configure URL, retries, specific boroughs
- **Statistics**: View cache and trending statistics after population
- **Dry Run Mode**: Test without making actual API calls
- **Cross-Platform**: Both Bash and Python versions available

## Security Considerations

- Scripts do not store or transmit authentication credentials
- Use HTTPS endpoints in production
- Consider running with specific user permissions
- Review script contents before execution

## Contributing

When adding new scripts:
1. Follow the same command-line interface patterns
2. Include proper error handling and retries
3. Add colored output for better UX
4. Update this README with new script documentation
5. Test on multiple platforms/shells