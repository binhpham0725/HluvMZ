import { renderHeader, initHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";

document.getElementById("app-header").innerHTML = renderHeader("about");
document.getElementById("app-footer").innerHTML = renderFooter();
initHeader();