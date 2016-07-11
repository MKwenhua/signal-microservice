const express      = require('express');
const fs           = require('fs');
const app          = new express();
const bodyParser   = require('body-parser');
const http       	 = require('http');
const path         = require('path');
const contentTypes = require('./utils/content-types');
const sysInfo      = require('./utils/sys-info');
const env          = process.env;
const socketio     = require('socket.io');
const redis        = require('redis');
const sio_redis    = require('socket.io-redis');
const NodeCache    = require( "node-cache" );
const redisShare   = redis.createClient(17129 , env.REDIS_ENDPOINT_A);
const pub          = redis.createClient(18071 , env.REDIS_ENDPOINT_B);
const sub          = redis.createClient(18071 , env.REDIS_ENDPOINT_B);


redisShare.auth(env.REDIS_A_PW,  (err) => {
     if (err){console.log(err)};
}); 
redisShare.on('connect',  (err) => {
    console.log('Connected to Redis');
 });
    

let server = http.createServer( (req, res) => {
  let url = req.url;
  console.log('url', url);
  if (url == '/') {
    url += 'index.html';
  }

  if (url == '/health') {
    res.writeHead(200);
    res.end();
  } else if (url == '/info/gen' || url == '/info/poll') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.end(JSON.stringify(sysInfo[url.slice(6)]()));
  } else {
    fs.readFile('./static' + url, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        let ext = path.extname(url).slice(1);
        res.setHeader('Content-Type', contentTypes[ext]);
        if (ext === 'html') {
          res.setHeader('Cache-Control', 'no-cache, no-store');
        }
        res.end(data);
      }
    });
  }
});

server.listen(env.NODE_PORT || 8443, env.NODE_IP || '127.0.0.1', () => {
  console.log(`Application worker ${process.pid} started...`);
});

const io  = socketio(server); 
const setAdapter = (() => {
	let num = 0;
	return () => {
		num += 1;
		if(num > 1){
			io.adapter(sio_redis({ pubClient: pub, subClient: sub }));
		}
	}
})();
sub.auth(env.REDIS_B_PW,  (err) => {
     if (err){console.log(err)};
     setAdapter();
}); 
pub.auth(env.REDIS_B_PW, (err)  => {
     if (err){console.log(err)};
     setAdapter();
}); 
const peerConnect = require('./peer_handler.js')(io);
const redisManager = require('./redis_session.js')(io,redisShare);
io.on('connection', (socket) => {

  socket.emit('newInstance', { sockId: socket.id} );
  socket.on('userUdid', (userData) => {
  	redisManager.setUserRedis(userData);
  	console.log('userUdid', userData);
  });
	socket.on('candidate', (candidate) => {
      socket.broadcast.emit('candidate', candidate);
  });
  socket.on('offer', (offer) => {
      socket.broadcast.emit('offer', offer);
  });
  socket.on('answer', (answer) => {
      console.log('relaying answer');
      socket.broadcast.emit('answer', answer);
  });
  socket.on('peer-connect', (peerObject) => {
      console.log('peerObject', peerObject);
      redisManager.addPeerOb(peerObject);
      //socket.broadcast.emit('answer', answer);
  });

});
