let app = require('express')();
let server = require('http').createServer(app);
let io = require('socket.io')(server);
var sqlite3 = require('sqlite3').verbose();
var request = require('request');
// const DeviceDetector = require('node-device-detector');

// const detector = new DeviceDetector; 
const DBSOURCE = "dbParear.sqlite";
const tableName_Com = 'smh_Com';
const url = 'http://192.168.0.240:9999/api/';
// const userAgent = 'Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Raspbian Chromium/78.0.3904.108 Chrome/78.0.3904.108 Safari/537.36';
// const device = detector.detect(userAgent);
const smhsqlite_ComodoCreateTableQuery = 'CREATE TABLE ' + tableName_Com + ' (id INTEGER PRIMARY KEY AUTOINCREMENT, IDMongodbComodo TEXT, IDMongodbUser TEXT, token TEXT)';
// console.log(device);

let db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message)
    throw err
  }else{
    console.log('CONECTADO A DATABASE  SQLITE.')
    db.run(smhsqlite_ComodoCreateTableQuery,(err) => {
      if (err) {
        console.log("Tabela Com ja esta criada");
      }else{
        // Table just created, creating some rows
        console.log("Tabela Com Criada com sucesso");
      }
    });
  }
});

// MIDDLEWARES
app.use(
  function(req, res, next){ 
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, Access-Control-Allow-Headers, Authorization");
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT');
    next();
  }
);

io.on('connection', (socket) => {
 
  socket.on('disconnect', function(){
    io.emit('teste'/*, {user: socket.username*/, {event: 'left'});   
  });
 
  socket.on('parearCom', (com) => {
    // socket.username = name;
    console.log(com);
    io.emit('comChanged', {com: com, event: 'alterCom'});    
  });
  
  socket.on('delCom', (com) => {
    console.log(com);
    messages = [];
    errors = [];
    if(com){
      db.run('DELETE FROM ' + tableName_Com + ' WHERE IDMongodbComodo = ?', com.id, function (err, result) {
        if (err){
          res.status(400).json({"error": res.message})
          errors.push({error: true, msg: 'erro de  delete database: ' + err});
          io.emit('delMessage', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
        }
        else{
          messages.push({error: false, msg: 'Comodo com id: ' + com.id + ' deletado'});
          io.emit('delMessage', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
        }
      });
    }
    else{
      errors.push({error: true, msg: 'Comodo Vazio: '});
      io.emit('delMessage', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
    }
  });
  
  socket.on('send-message', (message) => {
    console.log(message);
    messages = [];
    errors = [];
    
    messages.push({error: false, msg: 'Mensagem Recebida: ' + message});
    if(message){
      var p = [message.idCom]
      db.get("SELECT count(*) as t FROM " + tableName_Com + " WHERE IDMongodbComodo=?",p, (err,test) =>{
        if(err){
          console.log("deu erro: "+err);
          errors.push({error: true, msg: 'erro de  select count database: ' + err});
          io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
        }
        else{
          console.log(test.t);
          var count = test.t;
          if(count > 0){
            console.log("Ja existe comodo")
            messages.push({error: false, msg: 'Ja existe no banco de dados'});
            // io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
            var data = {
              idCom: message.idCom,
              idUser: message.idUs,
              token: message.tk
            };

            db.run(`UPDATE ` + tableName_Com + ` set 
            IDMongodbComodo = COALESCE(?,IDMongodbComodo), 
            IDMongodbUser = COALESCE(?,IDMongodbUser), 
            token = COALESCE(?,token)
            WHERE IDMongodbComodo = ?`,
            [data.idCom, data.idUser, data.token, data.idCom],
            function (err, result) {
              if (err){
                errors.push({error: true, msg: 'Erro Update Database '+ err});
                io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});    
              }
              else{
                messages.push({error: false, msg: 'Atualizado no banco de dados de pareamento'});
                b = {
                  'isPareado': true
                };
                h = {
                  'x-access-token': message.tk
                };
                //const options = {
                  //method: 'PUT',
                  //url: url+'updateBYIDComodo/'+message.idCom,
                  //headers: {
                      //'x-access-token': message.tk
                  //},
                  //body: {'isPareado': true}
                //};
                //{method: 'PUT', url: url+'updateBYIDComodo/'+message.idCom, body: b, headers: h}
                request({method: 'PUT', url: url+'updateBYIDComodo/'+message.idCom, json: b, headers: h}, function(err, res, bod){
                  if(err){
                    console.log(err);
                    errors.push({error: true, msg: 'Erro ao atualizar banco princpal '+ err});
                    io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
                  }
                  else{
                    console.log(bod);
                    messages.push({error: false, msg: 'Atualizado no banco de dados'});
                    io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
                  }
                  //console.log(res);
                });
                //io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
              }
            });
          }
          else{
            var sql ="INSERT INTO " + tableName_Com + " (IDMongodbComodo, IDMongodbUser, token) VALUES (?,?,?)";
            var params =[message.idCom, message.idUs, message.tk]
            db.run(sql, params, function (err, result) {
              if (err){
                errors.push({error: true, msg: 'Erro de Insert Database: ' + err});
                io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
              }
              else{
                messages.push({error: false, msg: 'Inserido com sucesso na database de pareamento'});
                b = {
                  'isPareado': true
                };
                h = {
                  'x-access-token': message.tk
                };
                //const options = {
                  //method: 'PUT',
                  //url: url+'updateBYIDComodo/'+message.idCom,
                  //headers: {
                      //'x-access-token': message.tk
                  //},
                  //body: {'isPareado': true}
                //};
                //{method: 'PUT', url: url+'updateBYIDComodo/'+message.idCom, body: b, headers: h}
                request.put({url: url+'updateBYIDComodo/'+message.idCom, json: b, headers: h}, function(err, res, bod){
                  if(err){
                    console.log(err);
                    errors.push({error: true, msg: 'Erro ao atualizar banco princpal '+ err});
                    io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
                  }
                  else{
                    console.log(bod);
                    messages.push({error: false, msg: 'Atualizado no banco de dados'});
                    io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
                  }
                  //console.log(res);
                });
                io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});
              }
            });
          }
        }              
      });
    }
    else{
      errors.push({error: true, msg: 'Mensagem Vazia: ' + msg});
      io.emit('message', {/*msg: message, user: socket.username*/msg: messages, err: errors, createdAt: new Date()});      
    }    
  });
});
 
var port = process.env.PORT || 3001;
 
server.listen(port, function(){
   console.log('listening in http://localhost:' + port);
});
