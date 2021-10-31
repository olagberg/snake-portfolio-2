import React from 'react';
import "./style/instructions.css";


let down = '/img/down.png';
let up = '/img/up.png';
let left = '/img/left.png';
let right = '/img/right.png';
let downleft = '/img/downleft.png';
let downright = '/img/downright.png';
let upleft = '/img/upleft.png';
let upright = '/img/upright.png';
let spacespeed = '/img/spacespeed.png';


const Instructions = () => {
    return (
        <div className="popUp">
            <div className="popUp-inner">
                <label>Turn up</label>
                <img className="snakeVertical" src={up} alt="img"/>
            </div>
            <div className="popUp-inner">
                <label>Turn down</label>
                <img className="snakeVertical" src={down} alt="img"/>
            </div>
            <div className="popUp-inner">
                <label>Turn left</label>
                <img className="snakeHorizontal" src={left} alt="img"/>
            </div>
            <div className="popUp-inner">
                <label>Turn right</label>
                <img className="snakeHorizontal" src={right} alt="img"/>
            </div>
            <div className="popUp-inner">
                <label>Boost your speed</label>
                <img className="space" src={spacespeed} alt="img"/>
            </div>
            <div className="popUp-inner">
                <label>Move upwards to the right</label>
                <img className="upright" src={upright} alt="img"/>
            </div>
            <div className="popUp-inner">
                <label>Move upwards to the left</label>
                <img className="upleft" src={upleft} alt="img"/>
            </div>
            <div className="popUp-inner">
                <label>Move downwards to the right</label>
                <img className="downright" src={downright} alt="img"/>
            </div>
            <div className="popUp-inner">
                <label>Move downwards to the left</label>
                <img className="downleft" src={downleft} alt="img"/>
            </div>
        </div>
    )
}


export default Instructions;