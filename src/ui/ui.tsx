import { NS } from "/typings/Bitburner";
import { styled } from "/vendor/styled-components-5.3.5/dist/styled-components.esm.js";
const React = window.React;
const ReactDOM = window.ReactDOM;
export async function main(ns: NS) {
	console.log(ns.ui.getStyles());
	console.log(ns.ui.getTheme());

	//@ts-ignore
	ReactDOM.render(
		<React.StrictMode>
			<h1>Helloworld</h1>
		</React.StrictMode>,
		document.getElementById("overview-extra-hook-0")
	);
}
