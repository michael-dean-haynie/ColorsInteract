// include modules
var http = require('http');
var websocket = require('websocket');
var fs = require('fs');

// init app scope vars
var theHtml = null;
var haveConnected = 0;
var clients = [];
var GS = new GameState([], []);
var lastPush = null;

// custom functions
function logStuff(msg){
  console.log((new Date()) + ' ' + msg);
}

// custom types
function Client(id, connection){
  this.id = id;
  this.connection = connection;
}

function Player(id, name){
  this.id = id;
  this.name = name;

}

function Offset(x, y){
  this.x = x;
  this.y = y;
}

function Piece(playerId, offset, color){
  this.playerId = playerId;
  this.offset = offset;
  // random rgb color with set alpha
  this.color = color || 'rgba(' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ', 0.33)';
}

function Board(){
  // these are arbitrary units. should figure out the actual pizles on the device
  this.size = 100;
  this.pieceSize = 5;
  this.pieceSpeed = 2;

  this.getRandomStartingOffset = function(){
    var maxX = this.size - this.pieceSize;
    var maxY = this.size - this.pieceSize;
    var x = Math.floor(Math.random() * (maxX + 1));
    var y = Math.floor(Math.random() * (maxY + 1));
    return new Offset(x, y);
  }

  this.calculateCorners = function(tlo){
    var ps = this.pieceSize;

    var corners = [tlo]; // top left
    corners.push(new Offset(tlo.x + ps, tlo.y      )); // top right
    corners.push(new Offset(tlo.x + ps, tlo.y + ps )); // bottom right
    corners.push(new Offset(tlo.x,      tlo.y + ps )); // bottom left

    return corners;
  }
}

function GameState(players, pieces){
  this.timestamp = Date.now(); // miliseconds since unix epoch
  this.board = new Board();
  this.players = players;
  this.pieces = pieces;

  this.updateTimestamp = function(){
    this.timestamp = Date.now();
  }

  this.addPlayer = function(player){    // add player
    this.players.push(player);
    this.pieces.push(new Piece(player.id, this.board.getRandomStartingOffset()));
    this.updateTimestamp();
  }

  this.removePlayer = function(playerId){
    this.players = this.players.filter(p => p.id != playerId);
    this.pieces = this.pieces.filter(p => p.playerId != playerId);
    this.updateTimestamp();
  }

  this.updatePiece = function(newPiece){ // replaces the piece that has the new pieces id with the new piece
    this.pieces = this.pieces.filter(p => p.playerId != newPiece.playerId);
    this.pieces.push(newPiece);
    this.updateTimestamp();
  }

  this.tryMovePiece = function(playerId, direction, speed = null){
    var s = speed || this.board.pieceSpeed;
    var cp = this.pieces.filter(p => p.playerId == playerId)[0]; // current piece
    var co = cp.offset; // current offset
    var to = new Offset(); // target offset

    switch(direction){
      case 'u':
        to.x = co.x;     to.y = co.y - s; break;
      case 'r':
        to.x = co.x + s; to.y = co.y;     break;
      case 'd':
        to.x = co.x;     to.y = co.y + s; break;
      case 'l':
        to.x = co.x - s; to.y = co.y;     break;
    }

    var corners = this.board.calculateCorners(to);
    var badCorners = corners.filter(c => (c.x < 0) || (c.x > this.board.size) ||
                                         (c.y < 0) || (c.y > this.board.size));
    if (badCorners.length == 0){
      this.updatePiece(new Piece(cp.playerId, to, cp.color));
    }
    else if (s > 1){
      this.tryMovePiece(playerId, direction, s-1);
    }
  }

  this.pushIfNew = function(){
    if(lastPush == null || lastPush < this.timestamp){
      var pushObj = {'msgType': 'new-game-state', 'GS': this};
      for(var i = 0; i < clients.length; i++){
        var client = clients[i];
        client.connection.sendUTF(JSON.stringify(pushObj));
      }
      lastPush = this.timestamp;
    }
  }
}
// get index.html ready with fs
fs.readFile('./index.html', function(err, html){
  if (err) { throw err; }
  theHtml = html;
});

// create a webserver
var httpServer = http.createServer(function (req, resp){
  resp.writeHeader(200, {'Content-Type': 'text/html'});
  resp.write(theHtml);
  resp.end();
});
httpServer.listen(8080, '0.0.0.0', function(){
    logStuff('Server running at 0.0.0.0:8080');
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
  
  // logStuff('Connection accepted [' + id + ']');
  // logStuff('Active connections: ' + clients.length);

  GS.updateTimestamp();
  GS.pushIfNew();

  connection.on('message', function(msg){
    var msgObj = JSON.parse(msg.utf8Data);

    switch(msgObj.msgType){
      case 'add-player':
        GS.addPlayer(new Player(id, msgObj.name));
        break;
      case 'move-piece':
        GS.tryMovePiece(id, msgObj.direction)
        break;
      case 'chat':
        // do things
        break;
    }
    
      GS.pushIfNew();
  });

  connection.on('close', function(reasonCode, description){
    clients = clients.filter(e => e.id != id);
    GS.removePlayer(id);
    GS.pushIfNew();
  });
});
