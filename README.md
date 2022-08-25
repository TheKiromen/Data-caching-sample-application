# Data caching sample application
 
Sample application with implementation of five caching strategies:
- Cache-Aside
- Read-Through
- Write-Through
- Write-Back
- Write-Around

Data is persisted in cloud MongoDB instance, then cached in Redis locally.  

To connect you need to provide your own connection string for MongoDB and collection name.  
If you have installed Redis locally it should connect automatically.

Redis instance used: [Redis for Windows](https://github.com/tporadowski/redis/releases)

