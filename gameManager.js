const { cardsToNumber } = require("./utils");
const { xor } = require("lodash");

class GameManager {
    constructor(maxPlayers) {
        this.deck = cardsToNumber;
        this.maxPlayers = maxPlayers;
        this.playersAmount = 0;
        this.pile = [];
        this.topPile = [];
        this.players = [];
        this.currentPlayerTurn = "";
    }

    addPlayer(socket) {
        this.playersAmount += 1;
        this.players.push({ id: socket.id, hand: [] });
    }

    initGame() {
        const firstCard = this.getRandomCard();
        this.pile.push(firstCard);
        this.topPile.push(firstCard);

        this.players.forEach((player) => {
            for (let index = 0; index < 5; index++) {
                player.hand.push(this.getRandomCard());
            }
        });
    }

    isPlayerTurn(id) {
        return id === this.currentPlayerTurn;
    }

    getPlayer(id) {
        return this.players.find((player) => player.id === id);
    }

    takeCardFromPile(id, thrownCards, cardFromPile) {
        this.pile.push(thrownCards);
        this.pile = this.pile.filter((card) => card !== cardFromPile);
        this.topPile = thrownCards;

        const player = this.getPlayer(id);

        player.hand = xor(player.hand, thrownCards);
        player.hand.push(cardFromPile);
    }

    takeCardFromDeck(id, thrownCards) {
        this.pile.push(thrownCards);
        this.topPile = thrownCards;

        const player = this.getPlayer(id);

        player.hand = xor(player.hand, thrownCards);
        player.hand.push(this.getRandomCard());
    }

    changePlayerTurn() {
        let nextPlayerIndex =
            (this.players.findIndex(
                    (player) => player.id === this.currentPlayerTurn
                ) +
                1) %
            this.playersAmount;

        this.currentPlayerTurn = this.currentPlayerTurn ?
            this.players[nextPlayerIndex].id :
            this.players[0].id;
    }

    getPlayersState() {
        return this.players.map((player) => ({
            id: player.id,
            name: player.name,
            cardsAmount: player.hand.length,
        }));
    }

    reset() {
        this.deck = cardsToNumber;
        this.playersAmount = 0;
        this.pile = [];
        this.topPile = [];
        this.players = [];
        this.currentPlayerTurn = "";
    }

    getRandomCard() {
        let keys = Array.from(this.deck.keys());
        const key = Math.floor(Math.random() * keys.length);
        this.deck.delete(keys[key]);

        return keys[key];
    }
}

module.exports = { GameManager };