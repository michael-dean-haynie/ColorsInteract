// include modules
var http = require('http');
var websocket = require('websocket');

// init app scope vars
var haveConnected = 0;
var clients = [];

// custom functions
function logStuff(msg){
  console.log((new Date()) + ' ' + msg);
}

// custom types
function Client(id, connection){
  this.id = id;
  this.connection = connection;
}








function Player(name, id){
  this.name = name;
  this.id = id;
}

function Offset(x, y){
  this.x = x;
  this.y = y;
}

function Piece(playerId, color, offset){
  this.playerId = playerId;
  this.color = color;
  this.offset = offset;
}

function GameState(players, pieces){
  this.timestamp = Date.now(); // miliseconds since unix epoch
  this.players = [];
  this.pieces = [];
}
















// create a webserver
var httpServer = http.createServer(function (req, resp){});
httpServer.listen(1234, '127.0.0.1', function(){
    logStuff('Server running at 127.0.0.1:1234');
});

// create web socket server
WebSocketServer = websocket.server;
wsServer = new WebSocketServer({
  httpServer: httpServer
})

wsServer.on('request', function(r){
  var connection = r.accept('echo-protocol', r.origin)
  var id = haveConnected++;
  clients.push(new Client(id, connection));
  logStuff('Connection accepted [' + id + ']');
  logStuff('Active connections: ' + clients.length);

  connection.on('message', function(msg){
      var msgString = msg.utf8Data;
      logStuff('Server received message from user ' + id + ': "' + msgString + '"');

      for(var i = 0; i < clients.length; i++){
        client = clients[i];
        client.connection.sendUTF('[User' + id + ']:' + msgString);
        logStuff('Server forwarded message from user ' + id + ' to user ' + client.id);
      }
  });

  connection.on('close', function(reasonCode, description){
    clients = clients.filter(e => e.id != id);
    logStuff('Connection closed [' + id + ']');
    logStuff('Active connections: ' + clients.length);
  });
});
