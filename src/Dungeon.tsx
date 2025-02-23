import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { shuffle } from 'lodash'

export enum Suit {
    SPADE,
    HEART,
    DIAMOND,
    CLUB,
}

export interface Card {
    face: number,
    suit: Suit
}
const CARD_BASE = 0x1F0A0;
const SHIELD = String.fromCodePoint(0x1F6E1);

function blackSuit(suit : Suit) {
    return suit == Suit.SPADE || suit == Suit.CLUB;
}

function cardSuit(suit : Suit) {
    switch (suit) {
        case Suit.SPADE: return 'spade';
        case Suit.DIAMOND: return 'diamond';
        case Suit.HEART: return 'heart';
        case Suit.CLUB: return 'club';
    }
}

function renderCard(card : Card | undefined) {
    let unicode = CARD_BASE;
    let suit = 'blank';
    if (card !== undefined) {
        const face = (card.face > 11 ? (card.face == 14 ? 1 : card.face + 1) : card.face);
        unicode = CARD_BASE + (card.suit) * 16 + face;
        suit = cardSuit(card.suit)
    }
    return <span className={`playingCard ${suit}`}>{String.fromCodePoint(unicode)}</span>;
}

function resetDeck() {
    const deckList: Card[] = [];
    for (const suit of [Suit.SPADE, Suit.CLUB]) {
        for (let face=2; face <= 14; face++) {
            deckList.push({face: face, suit: suit})
        }
    }
    // Red suits exclude the face cards
    for (const suit of [Suit.HEART, Suit.DIAMOND]) {
        for (let face=2; face <= 10; face++) {
            deckList.push({face: face, suit: suit})
        }
    }
    return shuffle(deckList);
}

const MAX_HEALTH = 20;

export interface FunctionalDamage {
    damage: number;
    blocked: boolean;
}

export default function Dungeon() {
    const [deck, setDeck] = useState<Card[]>();
    const [health, setHealth] = useState<number>(MAX_HEALTH);
    const [room, setRoom] = useState<Card[]>([undefined, undefined, undefined, undefined]);
    const [roomCount, setRoomCount] = useState(1);
    const [currentWeapon, setCurrentWeapon] = useState<Card>(undefined);
    const [lastDefeated, setLastDefeated] = useState<Card>(undefined);
    const [ranLastRoom, setRanLastRoom] = useState<boolean>(false);
    const [potionThisRoom, setPotionThisRoom] = useState<boolean>(false);
    const [best, setBest] = useState<number>(44);
    const [weaponEquipped, setWeaponEquipped] = useState<boolean>(false);
    const [winning, setWinning] = useState<boolean>(false);
    const [losing, setLosing] = useState<boolean>(false);
    const roomRemaining = room.filter(x => x !== undefined);
    const numInRoom = roomRemaining.length;

    function newRoom(curDeck: Card[], curRoom: Card[]) {
        // condense room left
        const newRoom = [];
        let toFill = 0;
        let ranThisRoom = false;
        const curRoomRemaining = curRoom.filter(x => x !== undefined);
        const curNumInRoom = curRoomRemaining.length;
        if (curNumInRoom == 4 && !ranLastRoom) {
            // shuffle current room and place on bottom
            deck.push(...shuffle(room));
            toFill = 4;
            ranThisRoom = true;
        } else {
            if (curNumInRoom > 1) {
                return;  // room isn't finished
            }
            if (curRoomRemaining.length === 1) {
                newRoom.push(curRoomRemaining[0]);
            }
            toFill = 4 - curRoomRemaining.length;
        }
        const deckRemoves = Math.min(toFill, curDeck.length);
        for (let i = 0; i < deckRemoves; i++) {
            newRoom.push(curDeck[i]);
        }
        setPotionThisRoom(false);
        setRanLastRoom(ranThisRoom);
        setDeck(curDeck.slice(deckRemoves));
        setRoom(newRoom);
        setRoomCount(roomCount + 1);
    }

    function drawDeck() {
        if (deck === undefined || winning || losing) {
            newRoom(resetDeck(), [undefined, undefined, undefined, undefined]);
            setRoomCount(1);
            setHealth(MAX_HEALTH);
            setCurrentWeapon(undefined);
            setLastDefeated(undefined);
            setWinning(false);
            setLosing(false);
            setWeaponEquipped(false);
        } else {
            if (numInRoom == 4) {
                newRoom(deck, room);
            }
        }
    }

    function getFunctionalDamage(damage: number) {
        let blocked = false;
        if (currentWeapon !== undefined && (lastDefeated === undefined || damage < lastDefeated.face)) {
            damage -= currentWeapon.face;
            blocked = true;
        }
        damage = Math.max(0, damage);
        let functionalDamage: FunctionalDamage = {
            damage: damage,
            blocked: blocked
        }
        return functionalDamage;
    }

    function useCard(index: number) {
        if (winning || losing) {
            return;
        }
        let newHealth = health;
        let newPotionThisRoom = potionThisRoom;
        let newLastDefeated = lastDefeated;
        let newCurrentWeapon = currentWeapon;
        if (room[index] === undefined) {
            return;
        }
        if (room[index].suit === Suit.HEART) {
            // potion
            if (!potionThisRoom) {
                newHealth = Math.min(MAX_HEALTH, newHealth + room[index].face);
                newPotionThisRoom = true;
            }
        }
        if (blackSuit(room[index].suit)) {
            if (weaponEquipped) {
                const functionalDamage = getFunctionalDamage(room[index].face);
                newHealth -= functionalDamage.damage;
                if (functionalDamage.blocked) {
                    newLastDefeated = room[index];
                }
            } else {
                newHealth -= room[index].face;
            }
        }
        if (room[index].suit === Suit.DIAMOND) {
            newCurrentWeapon = room[index];
            newLastDefeated = undefined;
        }
        room[index] = undefined;
        setPotionThisRoom(newPotionThisRoom);
        setHealth(newHealth);
        setLastDefeated(newLastDefeated);
        setCurrentWeapon(newCurrentWeapon);
        if (newHealth <= 0) {
            // handle losing
            setLosing(true);
        }
        if (numInRoom === 2 && deck.length > 0) {
            newRoom(deck, room);
        }
        if (numInRoom === 1 && deck.length === 0) {
            setWinning(true);
        }
        setBest(Math.min(deck === undefined ? best : deck.length+numInRoom-1, best));
    }

    function cardText(card : Card) {
        if (card === undefined) {
            return '';
        }
        let type = '';
        let extra = undefined;
        switch (card.suit) {
            case Suit.SPADE:
            case Suit.CLUB:
                type = 'Monster';
                const functionalDamage = getFunctionalDamage(card.face);
                const damage = weaponEquipped ? functionalDamage.damage : card.face;
                extra = `(${-1*damage}${weaponEquipped && functionalDamage.blocked ? SHIELD : ''})`
                break;
            case Suit.DIAMOND: type = 'Weapon'; break;
            case Suit.HEART:
                type = 'Potion';
                if (potionThisRoom) {
                    extra = '(X)'
                }
                break;
        }
        return <span className={cardSuit(card.suit)}>{type} {card.face} {extra}</span>
    }

    return <table className={`${winning ? 'win' : ''} ${losing ? 'lose' : ''}`}><tbody>
        <tr><td>Health: {health}</td>
            <td>{deck === undefined ? "" : `Room: ${roomCount}`}</td>
            <td></td>
            <td>{winning ? "You Win!" : ""}{losing ? "Better luck next time!" : ""}</td>
            <td></td>
            <td>Best: {best} Remaining</td>
        </tr>
        <tr><td>{deck === undefined || winning || losing ? "New Game": `${deck.length} Remaining` }</td>
            {[0,1,2,3].map(x => <td key={x}>{cardText(room[x])}</td>)}
            <td>{deck === undefined ? '' : `(${44-deck.length-numInRoom})`}</td>
        </tr>
        <tr><td><Button onClick={() => drawDeck()}>{renderCard(undefined)}</Button></td>
            {[0,1,2,3].map(x => <td key={x}><Button onClick={() => useCard(x)}>{renderCard(room[x])}</Button></td>)}
            <td><Button>{renderCard(undefined)}</Button></td>
        </tr>
        <tr><td>{numInRoom === 4 ? (ranLastRoom ? "Ran Last Room!" : "Run?") : ""}</td>
            <td>Current Weapon</td>
            <td>Last Defeated</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr><td></td>
            <td><Button className={weaponEquipped ? "activeWeapon" : ""} onClick={() => setWeaponEquipped(!weaponEquipped && currentWeapon !== undefined)}>{renderCard(currentWeapon)}</Button></td>
            <td><Button>{renderCard(lastDefeated)}</Button></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr><td></td>
            <td>{weaponEquipped ? "Equipped!" : "Click to equip"}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    </tbody>
    </table>
}