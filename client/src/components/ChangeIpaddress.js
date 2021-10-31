import React, {useEffect, useState} from "react";
import {getSocketIP, setSocketIP} from '../socketFile'

function ChangeIpaddress(props) {
    const [ipaddressInput, setIpaddressInput] = useState("")
    const [ipaddress, setIpaddress] = useState(initHook())

    // Makes the text you write visible
    const ipInput = (ip) => {
        setIpaddressInput(ip.target.value)
    }
    // Handles input-data and passes it to setIP if not empty
    const ipHandle = (ip) => {
        //ip.replace("https://", "")
        ip = ipaddressInput;
        if ((ip.length !== 0)) {
            setIP(ip)
        } else {
            setIP("127.0.0.1:8000/")
        }
    }
    // Sets ipaddress to socketfile and leaderboard and close old sockets
    const setIP = (ip) => {
        setIpaddress(ip)
        sessionStorage.setItem("ipaddress", JSON.stringify(ip))
        setSocketIP(ip);
        //setLeaderboardIP(ip)
    }

    // Checks for sessionStorage and init ipaddress hook
    function initHook() {
        const sessionIP = JSON.parse(sessionStorage.getItem("ipaddress"));

        if (sessionIP) {
            return sessionIP;
        } else {

            return getSocketIP();
        }
    }

    // Make sure to override ipaddress in socketfile and leaderboard
    function init() {
        const ip = JSON.parse(sessionStorage.getItem("ipaddress"));
        if (ip) {
            setSocketIP(ip);
        }
    }

    useEffect(() => {
        init()
    })


    return (
        <div>
            <h3 className="startPlaying">Set a custom server!</h3>
            <p className="changeServerFont">Don't include "https://" in the URL 🙂</p>
            <p className="changeServerFont">Current server: {ipaddress}</p>

            <form className="form" onSubmit={(ip) => ipHandle(ip)}>
                <input
                    className='input'
                    type="text"
                    placeholder="127.0.0.1:8000/"
                    value={ipaddressInput}
                    onChange={(ip) => ipInput(ip)}
                />
                <button
                    className='btnSubmit'
                    type="submit"
                    value="Submit"
                >CHANGE IP
                </button>
            </form>
        </div>
    );
}

export default ChangeIpaddress;