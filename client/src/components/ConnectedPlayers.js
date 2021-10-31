import store from "../redux/store";
import React from 'react';
import "./style/canvas.css"
import {Table} from "reactstrap";

const ConnectedPlayers = props => {

    function sortConnectedPlayers() {
        if (typeof props.gamestate?.players === 'undefined') {
            return <p className="errorPlayerBoard">Something went wrong &#128531;</p>
        } else {
            props.gamestate?.players.sort((a, b) => (a.score < b.score) ? 1 : -1)
            return (
                <Table className="OnlinePlayersBoard">
                    <thead>
                    <tr>
                        <th> </th>
                        <th className="header">Players</th>
                        <th> </th>
                    </tr>
                    </thead>
                    <thead>
                    {props.gamestate?.players.slice(0, 10).map((player, index) => (
                        <tr>
                            <th className="indexes" scope="row"> {++index}.</th>
                            {player.username === store.getState().user.user.username ?
                                <td className="thisUser"> {store.getState().user.user.username}</td> :
                                <td className="otherPlayers"> {player.username}</td>}
                            <td className="score"> {player.score}</td>
                        </tr>

                    ))}
                    </thead>
                </Table>)
        }

    }

    function getAmountOfPlayers() {
        if (!(typeof props.gamestate?.players === 'undefined')) {
            if (props.gamestate?.players.length > 10) {
                return (
                    <p>... and {props.gamestate?.players.length - 10} other players connected</p>
                )
            }
        }
    }

    function getConnectedPlayers() {
        let array = [];
        array.push(sortConnectedPlayers());
        array.push(getAmountOfPlayers())
        return array;
    }
    return <div>
        <div className='connectedPlayersContainer'>{getConnectedPlayers()}</div>
    </div>
}

export default ConnectedPlayers;