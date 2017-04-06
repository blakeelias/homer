module.exports = {
  servers: {
    one: {
      // TODO: set host address, username, and authentication method
      "host": "34.209.53.200",
      "username": "ubuntu",
      //"password": "password"
      // or pem file (ssh based authentication)
      "pem": "~/.ssh/Homer-blakeelias+amazon\@gmail.com.pem",
    }
  },

  meteor: {
    // TODO: change app name and path
    name: 'Homer',
    path: '../',

    servers: {
      one: {},
    },

    buildOptions: {
      serverOnly: true,
    },

    env: {
      // TODO: Change to your app's url
      // If you are using ssl, it needs to start with https://
      ROOT_URL: 'http://homer.mit.edu',
      MONGO_URL: 'mongodb://homer:homer@ds019956.mlab.com:19956/homer',
    },

    docker: {
      // change to 'kadirahq/meteord' if your app is not using Meteor 1.4
      image: 'abernix/meteord:base',
      // imagePort: 80, // (default: 80, some images EXPOSE different ports)
    },

    // This is the maximum time in seconds it will wait
    // for your app to start
    // Add 30 seconds if the server has 512mb of ram
    // And 30 more if you have binary npm dependencies.
    deployCheckWaitTime: 60,

    // Show progress bar while uploading bundle to server
    // You might need to disable it on CI servers
    enableUploadProgressBar: false
  },

  mongo: {
    port: 27017,
    version: '3.2.9',
    servers: {
      one: {}
    }
  }
};
