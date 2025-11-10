import {Home} from "./pages/Home/Home";
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'

import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import './App.css'

library.add(fas)


function App() {
 

  return (
  
    <Router>
      <Routes>
        <Route path="/" element ={<Home />}/>
      </Routes>
    </Router>
  )
}

export default App
