/*
* Canvas Team Draw
* Copyright (c) 2013 Licson (http://licson.net/)
*
* This is released under the MIT License
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/

var express = require('express');
var app = express();

var server = require('http').createServer(app);
var io = require('socket.io').listen(server, { log:false });

var ejs = require('ejs');
var fs = require('fs');

var createSession = function(){
	var chars = '0123456789abcdefghijklmnoupqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_='.split('');
	var ret = '';
	for(var i = 0; i < 50; i++){
		ret += chars[~~(Math.random()*chars.length)];
	}
	return ret;
};

var pickRandomProp = function(obj){
	var keys = Object.keys(obj)
	return obj[keys[~~(keys.length * Math.random())].substr(1)];
}

app.use(express.static(__dirname));

app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});

app.get('/rooms', function(req, res){
	res.send(
		ejs.render(
			fs.readFileSync(__dirname+'/rooms.html', 'utf-8'),
			{ rooms:io.sockets.manager.rooms }
		)
	);
});

server.listen(process.env.OPENSHIFT_NODEJS_PORT || 8000, process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1');
console.log('Server running at http://127.0.0.1:8000');

io.sockets.on('connection',function(socket){
	console.log('User ' + socket.id + ' has connected.');
	
	socket.on('create_session', function(){
		var id = createSession();
		socket.set('id', id, function(){
			socket.join(id);
			socket.emit('session_created', id);
			console.log('User ' + socket.id + ' joined room ' + id);
		});
	});
	
	socket.on('join_session',function(data){
		if(data){
			socket.set('id', data, function(){
				socket.join(data);
				socket.emit('session_created', data);
				socket.broadcast.to(data).emit('new_user', socket.id);
				console.log('User ' + socket.id + ' joined room ' + id);
			});
		}
		else
		{
			var id = pickRandomProp(io.sockets.manager.rooms);
			socket.set('id', id, function(){
				socket.join(id);
				socket.emit('session_created', id);
				socket.broadcast.to(id).emit('new_user', socket.id);
				console.log('User ' + socket.id + ' joined room ' + id);
			});
		}
	});
	
	socket.on('update', function(data){
		socket.get('id',function(e, id){
			if(!e){
				socket.broadcast.to(id).emit('update', data);
				console.log('User ' + socket.id + " in room " + id + " has updates");
			}
		});
	});
	
	socket.on('clear', function(){
		socket.get('id',function(e, id){
			if(!e){
				socket.broadcast.to(id).emit('clear', socket.id);
				console.log('User ' + socket.id + " in room " + id + " cleared all the contents");
			}
		});
	});
	
	socket.on('disconnect', function(){
		console.log('User ' + socket.id + ' has left');
	});
});