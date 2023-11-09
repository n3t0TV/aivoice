module.exports = {
    "database": {
      "host": "$YOUR_HOST",
      "hostdev":   "$YOUR_SANDBOX_HOST",
      "port": 3306,
      "user": "$YOUR_USER",
      "password": "$YOUR_PASSWORD",
      "database": "$YOUR_DATABASE",
      "connect" : true,
      "timezone" : 'utc',
      "ssl": true
    },
    "pool": {
      "max": 5,
      "min": 0,
      "acquire": 30000,
      "idle": 10000
    }  
  };