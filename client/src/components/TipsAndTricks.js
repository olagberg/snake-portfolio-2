import React from 'react';
import "./style/instructions.css";


const TipsAndTricks = () => {
    return (
        <div className="popUp">
            <div className="popUp-inner">
                <label>Skilled players can pass through other players while boosting... 🤩</label>
            </div>
            <div className="popUp-inner">
                <label>... But you're also easier to pass through 😫</label>
            </div>
            <div className="popUp-inner">
                <label>Make a custom server for custom rules and have fun with your friends! ✌</label>
            </div>
            <div className="popUp-inner">
                <label>Players turn into dust when they die! 😱</label>
            </div>
            <div className="popUp-inner">
                <label>Try to eat as much food as you can for a chance to top the leaderboard! 🐍</label>
            </div>
            <div className="popUp-inner">
                <label>Take advantage of boost when you're close to other players! 🔥</label>
            </div>
        </div>
    )
}


export default TipsAndTricks;