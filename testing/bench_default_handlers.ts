import { BenchmarkRunProgress, ProgressState } from "./bench.ts"
import { sumOf } from "../collections/sum_of.ts"
import { deepMerge } from "../collections/deep_merge.ts"

export type BenchmarkProgressHandler = (progress: BenchmarkRunProgress) => void | Promise<void>

/**
 * Returns a benchmark progress handler uusing the given config with sane defaults.
 *
 * By default, the returned handler will output a message to `console.log` for each
 * `BenchmarkRunProgress` event, but it is customizable in several ways.
 *
 * For more options, see `StandardProgressReporterOptions`
 *
 * Example:
 *
 * ```ts
 * import { standardProgressReporter } from "./bench_default_handlers.ts";
 * import { bench, runBenchmarks } from "../testing/bench.ts";
 * 
 * bench(() => {
 *   b.start();
 *   for (let i = 0; i < 1e9; i++);
 *   b.stop();
 * });
 * 
 * runBenchmarks({}, standardProgressReporter());
 * ```
 */
export function standardProgressReporter(options: StandardProgressReporterOptions = {}): BenchmarkProgressHandler {
    const {
        formatter,
        logger,
        progressFile,
        loggerVerbosity,
        fileVerbosity,
    } = deepMerge(
        defaultOptions,
        options,
    )

    return async (progress: BenchmarkRunProgress) => {
        const message = formatter(progress)

        switch (progress?.state) {
            case ProgressState.BenchmarkingStart:
            case ProgressState.BenchmarkingEnd:
            case ProgressState.BenchStart:
            case ProgressState.BenchResult:
                logger(message)

                if (progressFile !== undefined) {
                    await Deno.writeTextFile(progressFile, message, { append: true })
                }

                break;

            case ProgressState.BenchPartialResult:
                if (loggerVerbosity > ReporterVerbosity.ExcludePartialResults) {
                    logger(message)
                }

                if (progressFile !== undefined && fileVerbosity > ReporterVerbosity.ExcludePartialResults) {
                    await Deno.writeTextFile(progressFile, message, { append: true })
                }
        }
    }
}

/**
 * Options to pass to `standardProgressReporter` to customize its behaviour
 */
export type StandardProgressReporterOptions = {
    /**
     * Function to transform progress events into messages.
     *
     * Defaults to a simple formatter that tries to include
     * most significant points without being too verbose
     **/
    formatter?: (progress: BenchmarkRunProgress) => string,
    /**
     * Function that will be called with every formatted message to be logged.
     *
     * Defaults to `console.log`
     **/
    logger?: (message: string) => void,
    /**
     * Defined which event's messages should be passed to the `logger`
     *
     * Defaults to `IncludePartialResults`, which is all messages
     **/
    loggerVerbosity?: ReporterVerbosity,
    /**
     * Path to a text file that messages should be appended to. Will create
     * the file if it does not exist.
     *
     * Defaults to no file output
     **/
    progressFile?: string,
    /**
     * Defines which event's messages should be written into the `progressFile`
     *
     * Defaults to `ExcludePartialResults`, only writing bench-level messages
     **/
    fileVerbosity?: ReporterVerbosity,
}

/**
 * Defines which messages to ignore deepending on the `BenchmarkRunProgress`
 * event that caused it
*/
export enum ReporterVerbosity {
    /** Include all messages, which will include a message for each run of a single benchmark */
    IncludePartialResults = 20,
    /** Exlude messages caused by sigle runs of a specific benchmark */
    ExcludePartialResults = 10,
}

const defaultOptions: StandardProgressReporterOptions = {
    logger: (it) => console.log(it),
    loggerVerbosity: ReporterVerbosity.IncludePartialResults,
    formatter: defaultFormatter,
    fileVerbosity: ReporterVerbosity.ExcludePartialResults,
}

function defaultFormatter(progress: BenchmarkRunProgress): string {
    const newState = progress.state ?? null
    const finishedBenches = progress.results.length
    const runningBenches = progress?.running ? 1 : 0
    const totalBenches = finishedBenches + runningBenches + (progress?.queued?.length ?? 0)
    const totalBenchProgress = `[${finishedBenches + runningBenches}/${totalBenches}]`

    switch (newState) {
        case ProgressState.BenchmarkingStart:
            return `Starting benchmark${progress.filtered != 0 ? ` skipping ${progress.filtered} benches` : ''}...`
        case ProgressState.BenchStart:
            return `${totalBenchProgress} Running benchmark '${progress.running?.name}' for ${progress.running?.runsCount} runs...`
        case ProgressState.BenchPartialResult: {
            const running = progress?.running ?? error(`Received BenchResult event without running bench`)
            const runningName = running.name
            const runNumber = running.measuredRunsMs.length
            const runTime = running.measuredRunsMs.at(-1)

            return `${totalBenchProgress} ...finished run ${runNumber} of benchmark ${runningName} in ${runTime}ms...`
        }
        case ProgressState.BenchResult: {
            const finishedResult = progress.results.at(-1) ?? error(`Received BenchResult event without finished result`)
            const finishedName = finishedResult.name

            return `${totalBenchProgress} ...finished benchmark '${finishedName}' after ${finishedResult?.runsCount} runs in ${finishedResult?.totalMs}ms`
        }
        case ProgressState.BenchmarkingEnd: {
            const totalMeasuredTime = sumOf(progress.results, it => it.totalMs)

            return `...benchmarking finished!\n\n# of benchmarks run:\t${progress.results.length}\nTotal measured time:\t${totalMeasuredTime}`
        }
    }

    throw new Error(`Received unexpected benchmark ProgressState ${newState}`)
}

function error(msg: string): never {
    throw new Error(msg)
}
