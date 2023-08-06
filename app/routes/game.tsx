import React from 'react';
// import paho mqtt client
import { ClientOnly } from 'remix-utils';
import paho from 'paho-mqtt'
import fs from 'fs';
import { useLoaderData } from "@remix-run/react";
// prisma
import { PrismaClient } from '@prisma/client';
import { Form } from "@remix-run/react";
import type { ActionArgs } from "@remix-run/node"; // or cloudflare/deno

export const loader = async () => {
    var prisma = new PrismaClient();
    // get leaderboard entry with minimum time
    const minTimeEntry = await prisma.leaderboardEntry.findFirst({
        orderBy: {
            time: "asc"
        }
    });
    // read json from filesystem
    // file path: scripts/map.json
    // its weird cuz the dev runner runs from project root so need
    // to give relative path from that. def not production ready
    var file = fs.readFileSync('./scripts/map.json', 'utf8');
    // parse json
    var data = JSON.parse(file);
    // return data
    return {map: data, leaderboardEntry: minTimeEntry};
};

export async function action({ request }: ActionArgs) {
    var prisma = new PrismaClient();
    const body = await request.formData();
    // create new LeaderboardEntry
    const newEntry = await prisma.leaderboardEntry.create({
        data: {
            name: body.get("name")?.toString() || "",
            time: parseFloat(body.get("score") as string) || 1e7
        }
    })
    return new Response("ok");
}

const THRESHOLD = 40;
class Game extends React.Component<{data: {map: any[], leaderboardEntry: any}}, any>{

    client: paho.Client;
    state: { avgVals: string[], currentIdx: number, startTime: Date | null, endTime: Date | null } = { avgVals: [], currentIdx: 0, startTime: null, endTime: null };
    constructor(props: any) {
        super(props);
        console.log("tryign tconnect...")
        this.client = new paho.Client("ws://localhost:8883/mqtt", "browserClient");
        this.client.connect({ onSuccess: () => {
            console.log("connected") 
            this.client.subscribe("#");
        }});
        this.state.avgVals = Array(props.data.length).fill("0");
    }

    componentDidMount(): void {
        this.client.onMessageArrived = (message) => {
            // console.log(message)
            if (message.destinationName == 'avg_vals') {
                // parse payload as json
                const payload = JSON.parse(message.payloadString);
                // assume its key value where key is index of avgVals
                var newAvgVals = this.state.avgVals;
                // iterator over payload keys
                for (const [key, value] of Object.entries(payload)) {
                    var keyAsNumber = parseInt(key);
                    newAvgVals[keyAsNumber] = parseFloat(String(value)).toFixed(2);
                }
                this.setState({ avgVals: newAvgVals});
                if (parseFloat(newAvgVals[this.state.currentIdx]) > THRESHOLD) {
                    if (this.state.startTime == null)
                        this.setState({ startTime: new Date() });
                    if (this.state.currentIdx == this.props.data.map.length - 1)
                        this.setState({ endTime: new Date() });
                    this.setState({ currentIdx: this.state.currentIdx + 1 });

                }
                // console.log(`setting state to ${payload.avg_val}`)
            }
        }
    }
    render() {
        var lastTime = this.state.endTime == null? new Date(): this.state.endTime;
        var timeDisplay = this.state.startTime == null? "0.0": ((lastTime.getTime() - this.state.startTime.getTime())/1000).toFixed(1);
        var hsName = this.props.data.leaderboardEntry?.name;
        // make name all caps
        hsName = hsName?.toUpperCase();
        var hsTime = this.props.data.leaderboardEntry?.time;
        return (
            <div>
                <svg id="game-svg">
                    {
                        this.props.data.map.map((value, index) => {
                            return (
                                <g key={index}>
                                    <circle cx={value.x} cy={value.y} r={value.r} stroke="green" strokeWidth="0" fill="yellow" className={index < this.state.currentIdx? "is-done": ""}/>
                                    <text x={value.x} y={value.y-50} fill="red">{this.state.avgVals[index]}</text>
                                    <text x={value.x-11} y={value.y+12} fill="black" fontSize={40}>{index}</text>
                                </g>
                            )
                        })
                    }
                    <text x={1200} y={950} fill="white" fontSize={200}>{timeDisplay}</text>
                    <text x={300} y={950} fill="white" fontSize={70}>HS: {hsName} {hsTime}</text>
                </svg>
                {
                   (this.state.endTime != null) && (
                    // show a modal form to submit high score
                    <div>
                        <Form id="leaderboard-form" action="/game" method="post">
                            <input type="hidden" name="score" value={timeDisplay} />
                            {/* allow at most 4 characters in name */}
                            <input type="text" name="name" maxLength={4} />
                            <input type="submit" value="Submit" />
                        </Form>
                    </div>
                   )
                }
            </div>
        )
    }
}

var ClientOnlyGame = () => {
    const data = useLoaderData<typeof loader>();
    return (
        <ClientOnly>
            {() => <Game data={data} />}
        </ClientOnly>
    )
}

export default ClientOnlyGame;