const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { GameManager } = require("./gameManager");

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});

const maxPlayers = 2;
const roomNameToGameManager = new Map();

io.on("connection", (socket) => {
    onJoinRoom(socket);
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const onDisconnect = (socket, roomName) => {
    socket.on("disconnect", (reason) => {
        const gameManager = roomNameToGameManager.get(roomName);
        socket.broadcast.emit("onClientDisconnect", socket.id);
        io.disconnectSockets();
        gameManager.reset();
    });
};

const onJoinRoom = (socket) => {
    socket.on("onJoinRoom", (roomName) => {
        let gameManager = roomNameToGameManager.get(roomName);

        if (
            gameManager &&
            gameManager.playersAmount >= gameManager.maxPlayers
        ) {
            console.log("Room is full, client - ", socket.id, "disconnected");
            socket.emit("onRoomFull", roomName);
            socket.disconnect();
        }

        if (!gameManager) {
            roomNameToGameManager.set(
                roomName,
                new GameManager(maxPlayers, roomName)
            );

            gameManager = roomNameToGameManager.get(roomName);
        }

        socket.join(roomName);
        gameManager.addPlayer(socket);

        onGetPlayersName(socket, roomName);
        onDisconnect(socket, roomName);
        onCardTakenFromPile(socket, roomName);
        onCardTakeFromDeck(socket, roomName);
        onYaniv(socket, roomName);

        if (gameManager.playersAmount === gameManager.maxPlayers) {
            setTimeout(() => {
                onGameStart(socket, roomName);
            }, 100);
        }
    });
};

const onGameStart = (socket, roomName) => {
    const gameManager = roomNameToGameManager.get(roomName);

    gameManager.initGame();
    gameManager.players.forEach((player) => {
        io.to(player.id).emit("onGameStart", player.hand);
        io.to(player.id).emit(
            "onPlayersStateChange",
            gameManager.getPlayersState()
        );
        io.to(player.id).emit("onPileUpdate", {
            pile: gameManager.pile,
            topPile: gameManager.topPile,
        });
    });

    changePlayerTurn(gameManager);
};

const onCardTakenFromPile = (socket, roomName) => {
    /*
    2. check if the player has this card, and the pile also has this card (else change turns).
  */
    socket.on("onCardTakenFromPile", ({ thrownCards, cardFromPile }) => {
        const gameManager = roomNameToGameManager.get(roomName);

        if (!gameManager.isPlayerTurn(socket.id)) {
            return;
        }

        gameManager.takeCardFromPile(socket.id, thrownCards, cardFromPile);

        socket.emit("onCardTaken", gameManager.getPlayer(socket.id).hand);
        io.to(roomName).emit("onPileUpdate", {
            pile: gameManager.pile,
            topPile: gameManager.topPile,
        });

        io.to(roomName).emit(
            "onPlayersStateChange",
            gameManager.getPlayersState()
        );
        changePlayerTurn(gameManager);
    });
};

const onCardTakeFromDeck = (socket, roomName) => {
    /*
    2. check if the player has this card, and the deck has cards in it (else change turns).
  */
    socket.on("onCardTakeFromDeck", (thrownCards) => {
        const gameManager = roomNameToGameManager.get(roomName);

        if (!gameManager.isPlayerTurn(socket.id)) {
            return;
        }

        gameManager.takeCardFromDeck(socket.id, thrownCards);

        socket.emit("onCardTaken", gameManager.getPlayer(socket.id).hand);
        io.to(roomName).emit("onPileUpdate", {
            pile: gameManager.pile,
            topPile: gameManager.topPile,
        });

        io.to(roomName).emit(
            "onPlayersStateChange",
            gameManager.getPlayersState()
        );
        changePlayerTurn(gameManager);
    });
};

const onGetPlayersName = (socket, roomName) => {
    socket.on("onGetPlayerName", (name) => {
        roomNameToGameManager.get(roomName).getPlayer(socket.id).name = name;
    });
};

const onYaniv = (socket, roomName) => {
    socket.on("onYaniv", (id) => {
        const gameManager = roomNameToGameManager.get(roomName);

        if (gameManager.calcHandSum(id) <= 7) {
            const minScorePlayer = gameManager.getMinHandScorePlayer();

            if (id === minScorePlayer.id) {
                io.to(roomName).emit("onPlayerWin", {
                    winner: minScorePlayer,
                    state: gameManager.players,
                });
            } else {
                io.to(roomName).emit("onAsaf", {
                    winner: minScorePlayer,
                    state: gameManager.players,
                });
            }
        }
    });
};

const validateDepositedCards = (cards, roomName) => {
    console.log("To Be Implemented");
};

const changePlayerTurn = (gameManager) => {
    gameManager.changePlayerTurn();
    io.to(gameManager.roomName).emit(
        "onTurnChanged",
        gameManager.currentPlayerTurn
    );
};