// Race Game Server
/////////////////  GLOBAL  /////////////////


const { stringify } = require('querystring');

/*
g_top=
{
  "players": {
    "player_name": {
      "room_id": "room_id",
      "last_updated_time": "time" 
    }
  },
  "rooms": {
    "room_id": {
      "player_names": {
        "player_name": {}
      },
      "host_name": "player_name",
      "is_started": "yes/no"
    }
  },
  "update_rate": 3000,
  'online_update_interval': 60000,
  'last_updated_room': 0,
  'player_name_max_length': 64,
}
*/
var g_top = {
  "players": {},
  "rooms": {},
  "update_rate": 3000,
  'online_update_interval': 60000,
  'last_updated_room': 0,
  'player_name_max_length': 64,
};




function g_is_valid_player_name(player_name) {
  if (player_name === undefined) {
    console.log('warning: player name is undefined.')
    return false
  }
  if (player_name === null) {
    console.log('warning: player name is null.')
    return false
  }
  if (!(/^[A-Za-z0-9_]+$/.test(player_name))) {
    console.log('warning: player name is not alphanumeric a/o _.')
    return false
  }
  if (player_name.length > g_top['player_name_max_length']) {
    console.log('warning: player name is greater than ' + g_top['player_name_max_length'] + ' characters.')
    return false
  }
  return true
}
function g_is_valid_room_id(room_id) {
  if (room_id === undefined) {
    console.log('warning: room id is undefined.')
    return false
  }
  if (room_id === null) {
    console.log('warning: room id is null.')
    return false
  }
  if (!(/^[0-9]+$/.test(String(room_id)))) {
    console.log('warning: room id is not a number')
    return false
  }
  return true
}
function g_is_player_registered(player_name) {
  return player_name in g_top['players']
}
function g_is_room_exists(room_id) {
  return room_id in g_top['rooms']
}

function g_is_player_in_room(player_name, room_id) {
  if (g_is_valid_player_name(player_name) && g_is_player_registered(player_name) && g_is_valid_room_id(room_id) && g_is_room_exists(room_id)) {
    return player_name in g_top['rooms'][room_id]['player_names']
  } else {
    return false
  }
}

function g_get_player_room_id(player_name) {
  let room_id = null
  if (g_is_valid_player_name(player_name) && g_is_player_registered(player_name)) {
    room_id = g_top['players'][player_name]['room_id']
  }
  return room_id
}

function g_update_player_update_time(player_name) {
  if (g_is_player_registered(player_name)) {
    g_top['players'][player_name]['last_updated_time'] = Date.now()
  } else {
    // do nothing
  }
  // no return
}

function g_add_player(player_name) {
  if (!g_is_valid_player_name(player_name)) {
    console.log('add player IS THE ISSUE.')
    console.log('warning: player_name is invalid. ignored.')
    return { 'status': 'fail', 'msg': 'user_is_invalid' }
  }
  if (g_is_player_registered(player_name)) {
    console.log('warning: player_name exists: ' + player_name + '. ignored.')
    return { 'status': 'fail', 'msg': 'user_exists' }
  }
  g_top["players"][player_name] = { 'room_id': null, 'last_updated_time': Date.now() };
  return { 'status': 'success', 'msg': 'user_added' }
}

function g_create_room(player_name) {
  if (!g_is_valid_player_name(player_name)) {
    console.log('create room IS THE ISSUE.')
    console.log('warning: player_name is invalid. ignored.')
    return { 'status': 'fail', 'msg': 'user_is_invalid' }
  }
  if (!g_is_player_registered(player_name)) {
    return { 'status': 'fail', 'msg': 'user_does_not_exist' }
  }
  if (g_is_valid_room_id(g_top['players'][player_name]['room_id'])) {
    return { 'status': 'fail', 'msg': 'user_has_room ' + g_top['players'][player_name]['room_id'] }
  }
  g_top['last_updated_room']++
  let room_id = g_top['last_updated_room']
  g_top['rooms'][room_id] = { 'player_names': {}, 'host_name': player_name, 'is_started': 'no' }
  g_top['rooms'][room_id]['player_names'][player_name] = {}
  g_top['players'][player_name]['room_id'] = room_id

  return { 'status': 'success', 'msg': 'room created' }
}

function g_join_room(player_name, room_id) {
  if (!g_is_valid_player_name(player_name)) {
    console.log('warning: player_name is invalid. ignored.')
    return { 'status': 'fail', 'msg': 'user_is_invalid' }
  }
  if (!g_is_player_registered(player_name)) {
    return { 'status': 'fail', 'msg': 'user_does_not_exist' }
  }
  if (!g_is_valid_room_id(room_id)) {
    return { 'status': 'fail', 'msg': 'room_id_is_invalid' }
  }
  if (g_get_player_room_id(player_name) !== null) {
    return { 'status': 'fail', 'msg': 'user_has_room ' + g_get_player_room_id(player_name) }
  }
  if (!g_is_room_exists(room_id)) {
    return { 'status': 'fail', 'msg': 'room_does_not_exist' }
  }
  g_top['rooms'][room_id]['player_names'][player_name] = {}
  g_top['players'][player_name]['room_id'] = room_id
  return { 'status': 'success', 'msg': 'room_joined' }
}

function g_remove_player(player_name) {
  if (!g_is_valid_player_name(player_name)) {
    console.log('warning: player_name is invalid. ignored.')
    return { 'status': 'fail', 'msg': 'user_is_invalid' }
  }
  if (!g_is_player_registered(player_name)) {
    return { 'status': 'fail', 'msg': 'user_does_not_exist' }
  }
  let room_id = g_top['players'][player_name]['room_id']
  if (g_is_valid_room_id(room_id)) {
    if (!g_is_room_exists(room_id)) {
      console.log('error: user is in nonexisting room ' + room_id)
    } else {
      if (g_top['rooms'][room_id]['host_name'] === player_name) {
        for (let player in g_top['rooms'][room_id]['player_names']) {
          debug('remove host_name')
          console.log()
          g_top['players'][player]['room_id'] = null
        }
        delete g_top['rooms'][room_id]
      } else {
        delete g_top['rooms'][room_id]['player_names'][player_name]
      }
    }
  }
  delete g_top['players'][player]
  console.log(`player_name: ${player_name} HAS BEEN REMOVED!`)
  return { 'status': 'success', 'msg': 'user_removed' }
}

function g_leave_room(player_name) {
  if (!g_is_valid_player_name(player_name)) {
    console.log('warning: player_name is invalid. ignored.')
    return { 'status': 'fail', 'msg': 'user_is_invalid' }
  }
  if (!g_is_player_registered(player_name)) {
    return { 'status': 'fail', 'msg': 'user_does_not_exist' }
  }
  let room_id = g_top['players'][player_name]['room_id']
  if (g_is_valid_room_id(room_id)) {
    if (!g_is_room_exists(room_id)) {
      console.log('error: user is in nonexisting room ' + room_id)
    } else {
      if (g_top['rooms'][room_id]['host_name'] === player_name) {
        for (let player in g_top['rooms'][room_id]['player_names']) {
          debug('host leaves and remove room')
          g_top['players'][player]['room_id'] = null
        }
        delete g_top['rooms'][room_id]
      } else {
        delete g_top['rooms'][room_id]['player_names'][player_name]
        g_top['players'][player_name]['room_id'] = null
      }
    }
  }
  return { 'status': 'success', 'msg': 'user_removed' }
}

function g_remove_room() {

}

////////////////  DEBUG  ///////////////////

function debug(tag) {
  console.log(tag + ': ' + JSON.stringify(g_top, null, 2))
}

////////////////  GAME  /////////////////
function shuffle_array(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}


function draw_card(room_id, player_name) {
  let draw_pile = g_top['rooms'][room_id]['draw_pile']
  let discard_pile = g_top['rooms'][room_id]['discard_pile']
  let hand = g_top['rooms'][room_id]['player_names'][player_name]['hand']
  if (draw_pile.length === 0) {
    g_top['rooms'][room_id]['draw_pile'] = shuffle_array(discard_pile)
    g_top['rooms'][room_id]['discard_pile'] = []
  }
  hand.push(draw_pile.pop())
  return { 'status': 'success', 'msg': 'card_drawn' }
}

function set_up_game(room_id) {
  let draw_pile=shuffle_array(['0', '1', '1', '1', '1', '1', '2', '2', '2', '3', '3', '3', '4', '4', '5', '5', '6', '7', '8', '9', '10'])
  let discard_pile=[]
  g_top['rooms'][room_id]['draw_pile']=draw_pile
  g_top['rooms'][room_id]['discard_pile']=discard_pile
  for(player_name in g_top['rooms'][room_id]['player_names']){
    let hand=[]
    g_top['rooms'][room_id]['player_names'][player_name]['hand']=hand
    draw_card(room_id, player_name)
  }
}


function start_game(api_data) {
  let player_name = api_data['player_name']
  if (!g_is_valid_player_name(player_name)) {
    console.log('warning: player_name is invalid. ignored.')
    return { 'status': 'fail', 'msg': 'user_is_invalid' }
  }
  if (!g_is_player_registered(player_name)) {
    return { 'status': 'fail', 'msg': 'user_does_not_exist' }
  }
  let room_id = g_get_player_room_id(player_name)
  if (room_id === null) {
    return { 'status': 'fail', 'msg': 'Room has been deleted by host. Please leave the room.' }
  }
  if (!(g_top['rooms'][room_id]['host_name'] === player_name)) {
    return { 'status': 'fail', 'msg': 'Only host can start the game.' }
  }
  g_top['rooms'][room_id]['is_started'] = 'yes'

  set_up_game(room_id)
  


  return { 'status': 'success', 'msg': 'Game started.', 'data': {} }
}


////////////////  ROOM  /////////////////

function create_room(api_data) {
  let player_name = api_data['player_name']
  console.log('api_data: ' + JSON.stringify(api_data))
  let ret = g_create_room(player_name)
  if (ret['status'] === 'fail') {
    return ret
  }
  let room_id = g_get_player_room_id(player_name)
  let data = { 'player_names': {}, 'room_id': room_id, 'host_name': player_name, 'is_started': g_top['rooms'][room_id]['is_started'] }
  data['player_names'][player_name] = {}
  console.log('data: ' + data)
  ret['data'] = data
  return ret
}

function join_room(api_data) {
  let room_id = api_data['room_id']
  let player_name = api_data['player_name']
  console.log('api_data: ' + JSON.stringify(api_data))
  console.log('room_id: ' + room_id)
  let ret = g_join_room(player_name, room_id)
  if (ret['status'] === 'fail') {
    return ret
  }
  let data = { 'player_names': g_top['rooms'][room_id]['player_names'], 'room_id': g_get_player_room_id(player_name), 'host_name': g_top['rooms'][room_id]['host_name'], 'is_started': g_top['rooms'][room_id]['is_started'] }
  console.log('data: ' + JSON.stringify(data))
  ret['data'] = data
  return ret
}

function leave_room(api_data) {
  let player_name = api_data['player_name']
  console.log('api_data: ' + JSON.stringify(api_data))
  let ret = g_leave_room(player_name)
  return ret
}

function update_room_player_list(api_data) {
  let player_name = api_data['player_name']
  console.log('api_data: ' + JSON.stringify(api_data))
  if (!g_is_valid_player_name(player_name)) {
    console.log(`warning: player name ${player_name} is invalid when updating room. ignored.`)
    return { 'status': 'fail', 'data': `player name ${player_name} is invalid when updating room.` }
  }
  if (!g_is_player_registered(player_name)) {
    console.log(`warning: player name ${player_name} is not registered when updating room. ignored.`)
    return { 'status': 'fail', 'data': `player name ${player_name} is not registered when updating room.` }
  }
  let room_id = g_get_player_room_id(player_name)
  if (room_id === null) {
    return { 'status': 'fail', 'msg': 'Room has been deleted by host. Please leave the room.' }
  }
  if (!g_is_valid_room_id(room_id)) {
    console.log(`warning: room id ${room_id} is invalid when updating room. ignored.`)
    return { 'status': 'fail', 'msg': `room id ${room_id} is invalid when updating room.` }
  }
  let ret = { 'status': 'success', 'data': g_top['rooms'][room_id] }
  return ret
}


////////////////  LOBBY  /////////////////

function update_lobby(api_data) {
  let player_name = api_data['player_name']
  if (!g_is_valid_player_name(player_name)) {
    console.log(`warning: player name ${player_name} is invalid when updating lobby. ignored.`)
    return
  }
  if (!g_is_player_registered(player_name)) {
    console.log(`warning: player name ${player_name} is not registered when updating lobby. ignored.`)
    return
  }
  let ret = { 'status': 'success', 'data': g_top }
  return ret
}

////////////////////  LOGIN  //////////////////

function login(api_data) {
  let player_name = api_data['player_name']
  let ret = g_add_player(player_name)
  return ret
}

/////////////////  LIVE UPDATE  /////////////////

function update() {
  debug('update')
  //make sure player is online
  for (player in g_top['players']) {
    if (Date.now() - g_top['players'][player]['last_updated_time'] > g_top['online_update_interval']) {
      console.log('player ' + player + ' is OFFLINE. removed.')
      g_remove_player(player)
      //delete g_top['players'][player]
    }
  }
  console.log('updated')
}

/////////////////  API FUNCTION  /////////////////

function recieve_api_data(req, res) {
  let api_name = req.body['api_name']
  let api_data = req.body['api_data']
  let player_name = api_data['player_name']

  console.log('api_name: ' + api_name)////
  console.log('api_data: ' + JSON.stringify(api_data))////

  g_update_player_update_time(player_name)

  let ret = null
  if (api_name === 'login') {
    ret = login(api_data)
  } else if (api_name === 'update_lobby') {
    ret = update_lobby(api_data)
  } else if (api_name === 'update_room_player_list') {
    ret = update_room_player_list(api_data)
  } else if (api_name === 'create_room') {
    ret = create_room(api_data)
  } else if (api_name === 'join_room') {
    ret = join_room(api_data)
  } else if (api_name === 'leave_room') {
    ret = leave_room(api_data)
  } else if (api_name === 'start_game') {
    ret = start_game(api_data)
  }
  console.log(`RESPONSETEXT (server end): -->${JSON.stringify(ret)}<--`)

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
  const path = require('path')

  client.use(cors({ origin: '*' }))
  client.use(body_parser.json())
  client.use(body_parser.urlencoded())
  client.use("/img", express.static(path.join(__dirname, 'public')))
  client.post('/api', recieve_api_data)
  client.get('/', home_func)
  setInterval(update, g_top['update_rate']);
  const port = 3000
  client.listen(port, () => {
    console.log('Game server started at port: ' + port)
  })
}

// entry point
main(); 