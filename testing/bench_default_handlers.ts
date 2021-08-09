import { BenchmarkRunProgress, ProgressState } from "./bench.ts"
import { sumOf } from "../collections/sum_of.ts"

function error(msg: string): never {
    throw new Error(msg)
}

export type StandardProgressReporterOptions = {
    logger?: (message: string) => void,
    progressFile?: string,
    formatter?: BenchmarkProgressFormatter,
}

export class BenchmarkProgressFormatter {
    private progress: BenchmarkRunProgress | null = null;

    sanitizeBenchName(name: string): string {
        return name.replaceAll(/\s/ug, " ")
    }

    format(progress: BenchmarkRunProgress): string {
        const currentState = this.progress?.state ?? null
        const newState = progress.state ?? null
        const finishedBenches = progress.results.length
        const runningBenches = progress?.running ? 1 : 0
        const totalBenches = finishedBenches + runningBenches + (progress?.queued?.length ?? 0)
        const totalBenchProgress = `[${finishedBenches + runningBenches}/${totalBenches}]`

        const message = (() => {
            switch (newState) {
                case ProgressState.BenchmarkingStart:
                    return `Starting benchmark${progress.filtered != 0 ? ` skipping ${progress.filtered} benches` : ''}...`
                case ProgressState.BenchStart:
                    return `${totalBenchProgress} Running benchmark '${progress.running?.name}' for ${progress.running?.runsCount} runs...`
                case ProgressState.BenchPartialResult: {
                    const running = progress?.running ?? error(`Received BenchResult event without running bench`)
                    const runningName = this.sanitizeBenchName(running.name)
                    const runNumber = running.measuredRunsMs.length
                    const runTime = running.measuredRunsMs.at(-1)

                    return `${totalBenchProgress} ...finished run ${runNumber} of benchmark ${runningName} in ${runTime}ms...`
                }
                case ProgressState.BenchResult: {
                    const finishedName = this.progress?.running?.name ?? error(`Received BenchResult event without previous running bench`)
                    const finishedResult = progress.results.find(it => it.name === finishedName)

                    return `${totalBenchProgress} ...finished benchmark '${this.sanitizeBenchName(finishedName)}' after ${finishedResult?.runsCount} runs in ${finishedResult?.totalMs}ms`
                }
                case ProgressState.BenchmarkingEnd: {
                    const totalMeasuredTime = sumOf(progress.results, it => it.totalMs)

                    return `...benchmarking finished!\n\n# of benchmarks run:\t${progress.results.length}\nTotal measured time:\t${totalMeasuredTime}`
                }
            }

            throw new Error(`Received unexpected benchmark ProgressState ${newState} in state ${currentState}`)
        })()

        this.progress = progress

        return message
    }
}
