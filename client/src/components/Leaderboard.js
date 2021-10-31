import React, {useEffect, useState} from "react";
import {Table} from 'reactstrap';
import "./style/leaderboard.css"
import {onServerTick, updateLeaderboard} from '../socketFile'


function Leaderboard() {
    let ipaddress;
    // API ipaddress to fetch from
    if (sessionStorage.getItem("ipaddress")) {
        ipaddress =  "https://"+JSON.parse(sessionStorage.getItem("ipaddress")) + "/api/leaderboard";
    } else {
        ipaddress = 'https://localhost:8000/api/leaderboard/';
    }
    const [leaderboard, setLeaderboard] = useState([]);
    const [response, setResponse] = useState(0);

    function getLeaderboard() {
        // Fetch leaderboard from /api/leaderboard/ which is generated from mongodb server
        console.log("Fetching getLeaderboard()")
        fetch(ipaddress)
            .then(async response => {
                let responseStatus = response['status']
                console.log("RESPONSE: " + responseStatus)
                setResponse(responseStatus)
                return response.json()
            })
            // Set leaderboard to fetched data
            .then(data => setLeaderboard(data));
    }

    useEffect(() => {
        getLeaderboard();

        updateLeaderboard((data) => getLeaderboard())

    }, [updateLeaderboard])

    // return
    if (response === 200) {
        try {
            return (
                <Table className="leaderboard">
                    <caption className="headerLeader">Top 10 players</caption>
                    <thead className="headlines">
                    <tr>
                        <th>Rank</th>
                        <th>Playername</th>
                        <th>Score</th>
                    </tr>
                    </thead>
                    <tbody className="tbody">
                    {leaderboard.map((player, index) => (
                        <tr>
                            <th scope="row">{++index}</th>
                            <td>{player.username.username ? player.username.username : player.username}</td>
                            <td>{player.score}</td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            );
        } catch (error) {
            if (response === 503) {
                return <h1>😨 503 Database is not connected to the server 😨</h1>
            } else {
                return <h1>😫 {response}: An unexpected error has occurred 😫</h1>
            }
        }
    } else {
        if (response === 503) {
            return <h1>😨 503 Service Unavailable: Database is not connected to the server 😨</h1>
        } else {
            return <h1>😫 Error {response}: An unexpected error has occurred to the leaderboard 😫</h1>
        }
    }
}

export {Leaderboard}