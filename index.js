// include modules
var http = require('http');
var websocket = require('websocket');

// init app scope vars
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
  this.color = color || '#' + Math.floor(Math.random()*16777215).toString(16); // random hex color
}

function Board(){
  // these are arbitrary units. should figure out the actual pizles on the device
  this.width = 100;
  this.height = 100;
  this.pieceSize = 5;

  this.getRandomStartingOffset = function(){
    var maxX = this.width - this.pieceSize;
    var maxY = this.height - this.pieceSize;
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

  this.removePlayer = function(player){
    this.players = this.players.filter(e => e.id != player.id);
    this.updateTimestamp();
  }

  this.updatePiece = function(newPiece){ // replaces the piece that has the new pieces id with the new piece
    this.pieces = this.pieces.filter(p => p.playerId != newPiece.playerId);
    this.pieces.push(newPiece);
    this.updateTimestamp();
  }

  this.tryMovePiece = function(playerId, direction){
    var cp = this.pieces.filter(p => p.playerId == playerId)[0]; // current piece
    var co = cp.offset; // current offset
    var to = new Offset(); // target offset

    switch(direction){
      case 'u':
        to.x = co.x;     to.y = co.y - 1; break;
      case 'r':
        to.x = co.x + 1; to.y = co.y;     break;
      case 'd':
        to.x = co.x;     to.y = co.y + 1; break;
      case 'l':
        to.x = co.x - 1; to.y = co.y;     break;
      default:
        logStuff("Error: Invalid direction supplied to tryMovePiece()");
    }

    var corners = this.board.calculateCorners(to);
    var badCorners = corners.filter(c => (c.x < 0) || (c.x > this.board.width) ||
                                         (c.y < 0) || (c.y > this.board.height));
    if (badCorners.length == 0){
      this.updatePiece(new Piece(cp.playerId, to, cp.color));
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
    // logStuff('Connection closed [' + id + ']');
    // logStuff('Active connections: ' + clients.length);
  });
});
