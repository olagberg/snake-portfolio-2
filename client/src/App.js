import './App.css';

//Pages
import JoinGame from "./components/JoinGame";
import Canvas from './components/Canvas.js'

//Redux
import { selectUser } from "./redux/userSlice";
import { useSelector } from "react-redux";



function App() {
    const user = useSelector(selectUser);

    return (
        <div className="layout">
            {!user ? <JoinGame/> : <Canvas/>  //If state "user" is true, show canvas, if not, show mainpage(join game page)
            }
        </div>
    );
}
export default App;