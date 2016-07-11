module.exports = function peerHanle(io, redisShare) {
   const sessOB = {};
   sessOB.setUserRedis = (userData) => {
      let userJson = JSON.stringify(userData);
      let userKey = userData.udid;
      let speakerList = [];
      userData.userSpeaks.forEach( (ob, i) => {
         redisShare.smembers("online_users_" + ob + "_speaks", (err, reply) => {
            speakerList.concat(reply);

            redisShare.sadd("online_users_" + ob + "_speaks", userKey);
         });
      });
      userData.userLearn.forEach( (ob, i) => {
         redisShare.sadd("online_users_" + ob + "_learn", userKey);
      });
      // redisShare.mget(userData.userLearn)
      redisShare.hset("online_users:", userKey, userJson, (err, reply) => {
         // redisShare.hmget("online_users:",speakerList, function(err, reply){
         //   io.to(userData.sockId).emit('listSpeaks', reply);
         //});
         redisShare.hgetall("online_users:", (err, reply) => {
            io.to(userData.sockId).emit('listSpeaks', reply);
         });
      });

   };
   sessOB.addPeerOb = (userData) => {
      redisShare.hset("online_users:", userData.udid, JSON.stringify(userData), (err, reply) => {
         if (err) return;
         console.log('addPeerOb', reply);

      });
   };
   return sessOB;

};