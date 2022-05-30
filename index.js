// Gõ lệnh node index.js để bắt đầu chạy server

var express = require('express')  // Module xử lí chung
var mysql = require('mysql2')     // Module cho phép sử dụng cơ sở dữ liệu mySQL 
var mqtt = require('mqtt')        // Module cho phép sử dụng giao thức mqtt

var app = express()
var port = 80                   // Port của localhost do mình chọn

var exportCharts = require('./export.js') // Require file export.js

app.use(express.static("public"))
app.set("views engine", "ejs")
app.set("views", "./views")

var server = require("http").Server(app)
var io = require('socket.io')(server)

app.get('/', function (req, res) {
    res.render('home.ejs')
})

app.get('/history', function (req, res) {
    res.render('history.ejs')
})

server.listen(port, function () {
    console.log('Server listening on port ' + port)
})

//----------------------MQTT-------------------------
var options = {
    host: '862ee56fc3c645f78b0b94e5794bb76c.s1.eu.hivemq.cloud',
    port: 8883,
    protocol: 'mqtts',
    username: 'mackcest@gmail.com',
    password: 'Minh12112000'
}
var client = mqtt.connect('mqtt://broker.hivemq.com:1883',{clientId: 'clientId-mackcest'});


// // initialize the MQTT clientq 'mqtt://broker.hivemq.com:1883',{clientId: 'clientId-vn5n6NKqX8'}
// // declare topics
var topic1 = "light1";
var topic2 = "light2";
var topic3 = "fan1";
var topic4 = "fan2";


var topic_list = ["Temperature-humidity"];

client.on("connect", function () {
    console.log("connected mqtt " + client.connected);
});

client.on("error", function (error) {
    console.log("Can't connect" + error);
    process.exit(1)
});



// SQL--------Temporarily use PHPMyAdmin------------------------------
var con = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '13032000',
    database: 'sang_database'
});
// //---------------------------------------------CREATE TABLE-------------------------------------------------
con.connect(function (err) {
    if (err) throw err;
    console.log("mysql connected");
    var sql = "CREATE TABLE IF NOT EXISTS sensors11(ID int(10) not null primary key auto_increment, Time datetime not null, Temperature int(3) not null, Humidity int(3) not null, Light int(5) not null )"
    con.query(sql, function (err) {
        if (err)
            throw err;
        console.log("Table created");
    });
})

// var humi_graph = [];
// var temp_graph = [];
// var date_graph = [];
client.subscribe("Temperature-humidity");
var m_time
var newTemp
var newHumi
var newLight


// //--------------------------------------------------------------------
var cnt_check = 0;
client.on('message', function (topic, message) {
    console.log("topic:" + topic.toString());
    console.log("message is " + message);
    // console.log("topic is " + topic)
    const objData = JSON.parse(message);
    if (topic == "Temperature-humidity") {
        cnt_check = cnt_check + 1;
        newTemp = objData.Temperature;
        newHumi = objData.Humidity;
        newLight = objData.Light;
    }

    if (cnt_check == 1) {
        console.log("ready to save");
        var n = new Date();
        var month = n.getMonth() + 1;
        var Date_and_Time = n.getFullYear() + "-" + month + "-" + n.getDate() + " " + n.getHours() + ":" + n.getMinutes() + ":" + n.getSeconds();
        var sql = "INSERT INTO sensors11 (Time, Temperature, Humidity, Light) VALUES ('" + Date_and_Time.toString() + "', '" + newTemp + "', '" + newHumi + "', '" + newLight + "')"
        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("Table inserted");
            console.log(Date_and_Time + " " + newTemp + " " + newHumi + " " + newLight);
        });
        exportCharts(con, io);
        cnt_check = 0;
    }
})
// //----Socket---------Control devices----------------------------

io.on('connection', function (socket) {
    console.log("socket " + socket.id + " connected")
    socket.on('disconnect', function () {
        console.log(socket.id + " disconnected")
    })

    socket.on("light 1", function (data) {
        if (data == "on") {
            console.log('light 1 on')
            client.publish(topic1, 'light1on');
        }
        else {
            console.log('light 1 off')
            client.publish(topic1, 'light1off');
        }
    })

    socket.on("light 2", function (data) {
        if (data == "on") {
            console.log('light 2 on')
            client.publish(topic2, 'light2on');
        }
        else {
            console.log('light 2 off')
            client.publish(topic2, 'light2off');
        }
    })

    socket.on("fan 1", function (data) {
        if (data == "on") {
            console.log('fan 1 on')
            client.publish(topic3, 'fan1on');
        }
        else {
            console.log('fan 1 off')
            client.publish(topic3, 'fan1off');
        }
    })

    socket.on("fan 2", function (data) {
        if (data == "on") {
            console.log('fan 2 on')
            client.publish(topic4, 'fan2on');
        }
        else {
            console.log('fan 2 off')
            client.publish(topic4, 'fan2off');
        }
    })

   

    // Send data to History page
    var sql1 = "SELECT * FROM sensors11 ORDER BY ID"
    con.query(sql1, function (err, result, fields) {
        if (err) throw err;
        console.log("Full Data selected");
        var fullData = []
        result.forEach(function (value) {
            var m_time = value.Time.toString().slice(4, 24);
            fullData.push({ id: value.ID, time: m_time, temp: value.Temperature, humi: value.Humidity, light: value.Light })
        })
        io.sockets.emit('send-full', fullData)
    })
})
