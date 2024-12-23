
/////////////////  GLOBAL  /////////////////

var g_top = { "players": {}, "rooms": {} };
var g_update_rate = 3000
var g_online_update_interval = 5000
var g_last_updated_room = 0

////////////////  ROOM  /////////////////

function create_room(player_name) {
  g_last_updated_room++
  room_id = g_last_updated_room
  g_top['rooms'][room_id] = { 'player_names': [player_name], 'host': player_name }
  g_top['players'][player_name]['room_id'] = room_id


}

function join_room(player_name, room_id) {
  console.log('player_name: '+player_name)////////
  console.log('room-id: '+room_id)////////
  g_top['rooms'][room_id]['player_names'].push(player_name)
  g_top['players'][player_name]['room_id'] = room_id
}

function room_update(data) {
  room_id = data['room_id']
  player_name = data['player_name']
  console.log('data: '+JSON.stringify(data))
  if (room_id === null) {
    create_room(player_name)
  } else {
    if (g_top['players'][player_name]['room_id']===room_id){
      //do nothing
    }else{
      join_room(player_name, room_id)
    }
    
  }
  room_id = g_top['players'][player_name]['room_id']
  player_names = g_top['rooms'][room_id]['player_names']

  ret = { 'status': 'success', 'msg': { 'room_id': room_id, 'player_names': player_names } }
  return ret
}



////////////////  LOBBY  /////////////////

function lobby_update(data) {
  ret = { 'status': 'success', 'msg': g_top["players"] }
  return ret
}

////////////////////  LOGIN  //////////////////
function add_player(player_name) {
  if (player_name in g_top["players"]) {
    return { 'status': 'fail', 'msg': 'user_exists' }
  } else {
    g_top["players"][player_name] = { 'room_id': null, 'last_updated_time': Date.now() };
    return { 'status': 'success', 'msg': 'user_added' }
  }
}

function login(data) {
  ret = add_player(data)
  return ret
}

/////////////////  LIVE UPDATE  /////////////////

function update() {
  //make sure player is online
  for (player in g_top['players']) {
    if (Date.now() - g_top['players'][player]['last_updated_time'] > g_online_update_interval) {
      delete g_top['players'][player]
    }
  }
  console.log('updated')
}

/////////////////  API FUNCTION  /////////////////

function api_func(req, res) {
  player_name = req.body['player_name']

  console.log('api_name: ' + req.body['api_name'])////
  console.log('api_data: ' + JSON.stringify(req.body['api_data']))////

  if (player_name in g_top['players']) {
    g_top['players'][player_name]['last_updated_time'] = Date.now()
  } else {
    //do nothing
  }

  if (req.body['api_name'] === 'login') {
    ret = login(req.body['api_data'])
  } else if (req.body['api_name'] === 'lobby_update') {
    ret = lobby_update(req.body['api_data'])
  } else if (req.body['api_name'] === 'room_update') {
    ret = room_update(req.body['api_data'])
  }

  res.send(JSON.stringify(ret))
}


function home_func(req, res) {
  res.sendfile('client.html')
}

///////////  MAIN  ////////////

function main() {
  const express = require('express')
  const client = express()
  const body_parser = require('body-parser')
  const fs = require('fs')
  const cors = require('cors')
  client.use(cors({ origin: '*' }))
  client.use(body_parser.json())
  client.use(body_parser.urlencoded())
  client.post('/api', api_func)
  client.get('/', home_func)
  setInterval(update, g_update_rate);
  const port = 3000
  client.listen(port, () => {
    console.log('Game server started at port: ' + port)
  })
}

// entry point
main(); 