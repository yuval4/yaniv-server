const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { GameManager } = require("./gameManager");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});

const maxPlayers = 2;
const gameManager = new GameManager(maxPlayers);

io.on("connection", (socket) => {
    if (gameManager.playersAmount >= gameManager.maxPlayers) {
        console.log("Room is full, client - ", socket.id, "disconnected");
        socket.disconnect();
    }

    gameManager.addPlayer(socket);

    onGetPlayersName(socket);
    onDisconnect(socket);
    onCardTakenFromPile(socket);
    onCardTakeFromDeck(socket);
    onYaniv(socket);

    if (gameManager.playersAmount === gameManager.maxPlayers) {
        setTimeout(() => {
            onGameStart(socket);
        }, 100);
    }
});

httpServer.listen(3000);

const onDisconnect = (socket) => {
    socket.on("disconnect", (reason) => {
        socket.broadcast.emit("onClientDisconnect", socket.id);
        io.disconnectSockets();
        gameManager.reset();
    });
};

const onGameStart = (socket) => {
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

    changePlayerTurn();
};

const onCardTakenFromPile = (socket) => {
    /*
    2. check if the player has this card, and the pile also has this card (else change turns).
  */
    socket.on("onCardTakenFromPile", ({ thrownCards, cardFromPile }) => {
        if (!gameManager.isPlayerTurn(socket.id)) {
            return;
        }

        gameManager.takeCardFromPile(socket.id, thrownCards, cardFromPile);

        socket.emit("onCardTaken", gameManager.getPlayer(socket.id).hand);
        io.emit("onPileUpdate", {
            pile: gameManager.pile,
            topPile: gameManager.topPile,
        });
        io.emit("onPlayersStateChange", gameManager.getPlayersState());
        changePlayerTurn();
    });
};

const onCardTakeFromDeck = (socket) => {
    /*
    2. check if the player has this card, and the deck has cards in it (else change turns).
  */
    socket.on("onCardTakeFromDeck", (thrownCards) => {
        if (!gameManager.isPlayerTurn(socket.id)) {
            return;
        }

        gameManager.takeCardFromDeck(socket.id, thrownCards);

        socket.emit("onCardTaken", gameManager.getPlayer(socket.id).hand);
        io.emit("onPileUpdate", {
            pile: gameManager.pile,
            topPile: gameManager.topPile,
        });
        io.emit("onPlayersStateChange", gameManager.getPlayersState());
        changePlayerTurn();
    });
};

const onGetPlayersName = (socket) => {
    socket.on("onGetPlayerName", (name) => {
        gameManager.getPlayer(socket.id).name = name;
    });
};

const onYaniv = (socket) => {
    console.log("To Be Implemented");
};

const validateDepositedCards = (cards) => {
    console.log("To Be Implemented");
};

const changePlayerTurn = () => {
    gameManager.changePlayerTurn();
    io.emit("onTurnChanged", gameManager.currentPlayerTurn);
};
