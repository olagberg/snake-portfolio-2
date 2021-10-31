import React, {useEffect, useState} from "react";
import './style/joinGame.css'

function LastScore() {
    const [score, setScore] = useState(0)

    useEffect(() => {
        const newScore = JSON.parse(sessionStorage.getItem("score"))
        console.log("newscore: " + newScore)
        console.log("typeof newscore: " + (typeof newScore));
        if (typeof newScore === "number") {
            setScore(newScore)
        }
    }, [])
    console.log("Score: " + score)
    if (score) {
        return (
            <label style={{ textAlign:"center" }}>You died. Your last score was {score} 🔥 Not good enough? Try again! </label>
        )
    } else {
        return null
    }
}

export default LastScore;