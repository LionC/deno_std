import {
    buildConsoleLogger,
    buildFileLogger,
    buildMultiLogger,
    FileLoggerOptions,
} from "./builtin_loggers.ts";
import {
    LogHandler,
    buildDefaultLogMessage,
} from "./logging.ts";
import { assertEquals } from "../testing/asserts.ts";

const testLevels = {
  low: 1,
  middle: 2,
  high: 3,
};

type TestLevels = typeof testLevels;
type MessageTuple =
    | [keyof TestLevels, number, unknown]
    | [keyof TestLevels, number]

const logFile = "./__test.log"
const testLine = "Test line\n"

function resetLogFile() {
    Deno.writeTextFileSync(logFile, testLine)
}

function removeLogFile() {
    Deno.removeSync(logFile)
}

function readLogFile() {
    return Deno.readTextFileSync(logFile)
}

function buildTestFileLogger(options?: FileLoggerOptions<TestLevels, number, unknown>) {
    return buildFileLogger(
        testLevels,
        "middle",
        logFile,
        options,
    )
}

Deno.test("File logger with defautl settings logs to and overwrites the given file", () => {
    resetLogFile()
    const logger = buildTestFileLogger()

    const calls: MessageTuple[] = [
        ["middle", 5],
        ["low", 1, {}],
        ["high", 19],
        ["middle", -3, []],
        ["low", 32],
        ["low", 24, "asdf"],
        ["high", 0, () => {}],
        ["middle", 13],
    ]

    calls.forEach(([level, message, data]) => logger[level](message, data))
    logger.flush()

    const logged = calls
        .filter(([level]) => level !== "low")
        .map(([level, message, data]) => `${buildDefaultLogMessage(level, message, data)}\n`)
        .join("")

    assertEquals(
        readLogFile(),
        `${testLine}${logged}`,
    )

    logger.close()
});
