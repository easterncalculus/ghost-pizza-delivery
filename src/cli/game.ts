import { Game } from "../game/game";
import { Report, PlayerReport } from "../game/reports";

export class GameCli extends Game {
    sendPlayerReport(report: Report) {
        if (report instanceof PlayerReport) {
            report.player.receiveReport(report)
        } else {
            throw new Error(report.constructor.name)
        }
    }
}