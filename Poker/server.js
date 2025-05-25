//setup

const express = require('express');
var ws = require('ws');
var express_ws = require('express-ws')(express());
var app = express_ws.app;


var g_top = {
    convert: {'empty':1000000, 'A':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'J':11, 'Q':12, 'K':13},
    started: false,
    common: { buffer1: [], buffer2: [], playing1: 'empty', playing2: 'empty' },
    players: {},
    deck: ['2', '2', '2', '2',
        '3', '3', '3', '3',
        '4', '4', '4', '4',
        '5', '5', '5', '5',
        '6', '6', '6', '6',
        '7', '7', '7', '7',
        '8', '8', '8', '8',
        '9', '9', '9', '9',
        '10', '10', '10', '10',
        'J', 'J', 'J', 'J',
        'Q', 'Q', 'Q', 'Q',
        'K', 'K', 'K', 'K',
        'A', 'A', 'A', 'A',]
};


function broadcast(data) {
    // Broadcast data to all connected WebSocket clients
    express_ws.getWss('/ws').clients.forEach(client => {
        if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function shuffle_array(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

function recieve_api_data(req, res) {
    let api_name = req.body['api_name']
    let api_data = req.body['api_data']
    let player_name = api_data['player_name']

    console.log('api_name: ' + api_name)
    console.log('api_data: ' + JSON.stringify(api_data))

}

function home(req, res) {
    res.sendFile('index.html', { root: __dirname });
    console.log('Home page requested');
}


function join(data){

    let len = Object.keys(g_top['players']).length;
    console.log(len);
    if (len == 0) {
        g_top['players'][data.player_name] = {};
    } else if (len == 1) {
        g_top['players'][data.player_name] = {};
        g_top['started'] = true;
        g_top.deck = shuffle_array(g_top.deck);
        // Deal cards to players
        let cur = 0;
        for (let player in g_top['players']) {
            
            let buffer = g_top['deck'].slice(cur, cur + 20);
            cur += 20;
            g_top['players'][player]['cards'] = {
                hand: ['empty', 'empty', 'empty', 'empty', 'empty'],
                buffer: buffer
            };
        }

        g_top['common']['buffer1'] = g_top['deck'].slice(40, 45);
        g_top['common']['buffer2'] = g_top['deck'].slice(45, 50);
        g_top['common']['playing1'] = g_top['deck'][50];
        g_top['common']['playing2'] = g_top['deck'][51];
        broadcast({
            action: 'start_game',
            g_top: g_top
        });
    } else {
        console.log('Game already started with two players');
        return;
    }
}


function check_playing() {
    let ok =false;
    for (let player in g_top.players) {
        for (let card_idx in g_top.players[player].cards.hand) {
            card = g_top.players[player].cards.hand[card_idx];
            if (card == 'empty' && g_top.players[player].cards.buffer.length != 0) {
                ok = true;
                break;
            } 
            console.log('Checking card: ' + card);
            let distance1= Math.abs(g_top.convert[card]-g_top.convert[g_top.common['playing1']]);
            let distance2= Math.abs(g_top.convert[card]-g_top.convert[g_top.common['playing2']]);
            console.log('Distance to playing1: ('+g_top.common.playing1+')'+' ' + distance1);
            console.log('Distance to playing2: ('+g_top.common.playing2+')'+' ' + distance2);
            if (distance1<=1 || distance1 == 12 || distance2<=1 || distance2 == 12) {
                ok = true;
                break;
            }

        }
        if (ok) {
            break;
        }
        
    }
    return ok;

}

function has_won(player) {
    for (let card_idx in g_top.players[player].cards.hand) {
        if (g_top.players[player].cards.hand[card_idx] != 'empty') {
            return false; // Player still has cards in hand
        }
    }
    if (g_top.players[player].cards.buffer.length > 0) {
        return false; // Player still has cards in buffer
    }
    // Check if the player has played all cards
    return true;
}

function play_card(data) {
    if (data.from[1]=='empty'){
        return;
    }
    let distance=Math.abs(g_top.convert[data.to[1]]-g_top.convert[data.from[1]]);
    if ((distance<= 1 || distance==12) && data.from[0].charAt(0)=='s'){
        g_top.players[data.player_name].cards.hand[parseInt(data.from[0].charAt(9))-1]='empty';
        g_top.common['playing'+parseInt(data.to[0].charAt(11))]=data.from[1];

        broadcast({
            action: 'play_card',
            g_top: g_top,
        })
        if (has_won(data.player_name)){
            broadcast({
                action: 'end_game',
                winner: data.player_name,
            });
            console.log('Player ' + data.player_name + ' has won the game!');
            return;
        }
    } else{
        return;
    }
}


function refill_hand(data) {
    let player = data.player_name;
    let hand = g_top.players[player].cards.hand;
    let first_empty=-1;
    if (g_top.players[player].cards.buffer.length > 0) {
        for (let i = 0; i < hand.length; i++) {
            if (hand[i] === 'empty') {
                hand[i] = g_top.players[player].cards.buffer.pop();
                first_empty=i+1;
                g_top.players[player].cards.hand[i] = hand[i];
                break;
            }
        }
        if (first_empty==-1){
            return;
        }
        broadcast({
            action: 'refill_hand',
            g_top: g_top,
        });
    }


    console.log(g_top);
    if (!check_playing()) {
        g_top.common.playing1=g_top.common.buffer1.pop();
        g_top.common.playing2=g_top.common.buffer2.pop();
        broadcast({
            action: 'refill_playing',
            g_top: g_top
        });
    }
    return;
}

function respond(data) {

    if (data.action == 'join') {
        join(data);
    } else if (data.action == 'play_card') {
        play_card(data);
    } else if (data.action == 'refill_hand'){
        refill_hand(data);
    }
}
    ///////////  MAIN  ////////////

    function main() {
        const body_parser = require('body-parser')
        const fs = require('fs');
        const cors = require('cors');
        const path = require('path');

        app.use(cors({ origin: '*' }));
        app.use(body_parser.json());
        app.use(body_parser.urlencoded());
        app.use(express.static(path.join(__dirname, "js")));


        //app.use("/img", express.static(path.join(__dirname, 'public')))
        app.post('/api', recieve_api_data);
        app.get('/', home);
        app.ws('/ws', (ws, req) => {
            console.log('New WebSocket connection established');

            ws.on('message', (message) => {
                console.log('Received message:', message);

                const data = JSON.parse(message);
                respond(data, ws);
            });

            ws.on('close', () => {
                console.log('WebSocket connection closed');
            });
        }
        );
        const port = 3000;
        app.listen(port, () => {
            console.log('Game server started at port: ' + port)
        })
    }

    // entry point
    main(); 