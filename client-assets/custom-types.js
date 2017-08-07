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
  this.color = color;
}

function Board(size, pieceSize){
  // these are arbitrary units. should figure out the actual pizles on the device
  this.size = size;
  this.pieceSize = pieceSize;

  this.UPS = CPS / this.size; // unit pixel size
  this.PPS = this.UPS * this.pieceSize; // piece pixel size

  this.paint = function(){
    // wipe board
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CPS, CPS);

    // paint all the pieces
    for(var i = 0; i < CGS.pieces.length; i++){
      var piece = CGS.pieces[i];
      ctx.fillStyle = piece.color;
      ctx.fillRect(piece.offset.x*this.UPS, piece.offset.y*this.UPS, this.PPS, this.PPS)
    }
  }
}

function GameState(timestamp, board, players, pieces){
  this.timestamp = timestamp;
  this.board = board;
  this.players = players;
  this.pieces = pieces;
}
