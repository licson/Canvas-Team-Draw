var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server,{log:false});
var ejs = require('ejs');
var fs = require('fs');

console.log('Server running at http://127.0.0.1:8000');

var createSession = function(){
	var chars = '0123456789abcdefghijklmnoupqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_='.split('');
	var ret = '';
	for(var i = 0; i < 50; i++){
		ret+=chars[~~(Math.random()*chars.length)];
	}
	return ret;
};

var pickRandomProp = function(obj) {
	var keys = Object.keys(obj)
	return obj[keys[~~(keys.length * Math.random())].substr(1)];
}

app.use(express.static(__dirname));

app.get('/',function(req,res){
	res.sendfile(__dirname+'/index.html');
});
app.get('/rooms',function(req,res){
	res.send(ejs.render(fs.readFileSync(__dirname+'/rooms.html','utf-8'),{rooms:io.sockets.manager.rooms}));
});

server.listen(process.env.OPENSHIFT_INTERNAL_PORT||8000,process.env.OPENSHIFT_INTERNAL_IP||'127.0.0.1');

io.sockets.on('connection',function(socket){
	console.log('User '+socket.id+' has connected.');
	socket.on('create_session',function(){
		var id = createSession();
		socket.set('id',id,function(){
			socket.join(id);
			socket.emit('session_created',id);
			console.log('User '+socket.id+' joined room '+id);
		});
	});
	socket.on('join_session',function(data){
		if(data){
			socket.set('id',data,function(){
				socket.join(data);
				socket.emit('session_created',data);
				socket.broadcast.to(data).emit('new_user',socket.id);
				console.log('User '+socket.id+' joined room '+id);
			});
		}
		else
		{
			var id = pickRandomProp(io.sockets.manager.rooms);
			socket.set('id',id,function(){
				socket.join(id);
				socket.emit('session_created',id);
				socket.broadcast.to(id).emit('new_user',socket.id);
				console.log('User '+socket.id+' joined room '+id);
			});
		}
	});
	socket.on('update',function(data){
		socket.get('id',function(e,id){
			if(!e){
				socket.broadcast.to(id).emit('update',data);
				console.log('User '+socket.id+" in room "+id+" has updates");
			}
		});
	});
	socket.on('clear',function(){
		socket.get('id',function(e,id){
			if(!e){
				socket.broadcast.to(id).emit('clear',socket.id);
				console.log('User '+socket.id+" in room "+id+" cleared all the contents");
			}
		});
	});
	socket.on('disconnect',function(){
		console.log('User '+socket.id+' has left');
	});
});