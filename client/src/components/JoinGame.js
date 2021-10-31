import "./style/joinGame.css"

import React, {useEffect, useState} from 'react';
import {uniqueNamesGenerator, adjectives, animals} from 'unique-names-generator';

import {useDispatch} from "react-redux";
import {login} from "../redux/userSlice";
import {socketStatus} from '../socketFile';

//components
import ChangeIpaddress from "./ChangeIpaddress";
import TipsAndTricks from "./TipsAndTricks";
import LastScore from "./LastScore";
import Instructions from "./Instructions"
import {Leaderboard} from "./Leaderboard";

const JoinGame = () => {

    const randomUsername = uniqueNamesGenerator({
        //Generates a random name with an adjective and an animal. E.g. bigDonkey
        dictionaries: [adjectives, animals],
        separator: "",
        style: 'capital'
    });

    //Variables and states
    const [connected, setConnected] = useState(false)
    const [username, setUsername] = useState("")
    const dispatch = useDispatch();

    //Handling the information given by the user
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username) {
            setUsername(randomUsername)
        } else {
            dispatch(login({
                username: username,
            }));
        }
    }

    //Puts the users username into sessionstorage for use when user dies/exits and returns to joinGame-page

    useEffect(() => {
        const interval = setInterval(() => {
            if (!connected) {
                setConnected(socketStatus())
            }
        }, 300);
        return () => clearInterval(interval);
    }, [connected]);

    const handleInput = (e) => {
        setUsername(e.target.value)
    }

    const renderLogin = () => {
        if (connected) {
            return (<div className="container">
                <div className='mainPage'>
                    <h3 className="startPlaying">Welcome to the Hunger Games &#128013;</h3>
                    <LastScore> </LastScore>
                    <form className="form" onSubmit={(e) => handleSubmit(e)}>
                        <input
                            className='input'
                            type="text"
                            placeholder="Write your playername here"
                            value={username}
                            onChange={(e) => {
                                handleInput(e)
                            }}/>
                        <br/>
                        <label className="label">.. or get one by clicking join game</label>
                        <br/>
                        <button
                            className='btnSubmit'
                            type="submit"
                        >JOIN GAME
                        </button>
                    </form>
                </div>
                <Leaderboard> </Leaderboard>
                <div className="mainPage">
                    <ChangeIpaddress> </ChangeIpaddress>
                </div>
                <h1> HOW TO MOVE AROUND </h1>
                <Instructions> </Instructions>
                <br/>
                <h1>TIPS AND TRICKS</h1>
                <TipsAndTricks> </TipsAndTricks>
            </div>)
        } else {
            return (<div className="container">
                    <h1 style={{
                        color: "red"
                    }}>Server connection could not be established. Please select an
                        eligible server IP</h1>
                    <h1 style={{
                        color: "red"
                    }}>OBS! If you are using Mac or Linux, try 0.0.0.0:8000</h1>
                    <h2 style={{color: "black"}}>(Press the change IP button with a blank input field to go back to the
                        default ip)</h2>
                    <div className="mainPage">
                        <ChangeIpaddress valid={false}> </ChangeIpaddress>
                    </div>
                </div>
            )
        }
    }

    return (
        renderLogin()
    );
}

export default JoinGame;