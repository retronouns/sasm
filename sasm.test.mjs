import sasm from './sasm.mjs'
import parse from 'args-parser'
import fs from 'fs'

const fibonacci = fs.readFileSync('fibonacci.sasm', 'utf-8')

const onCompile = (vm) => {
    while(true) {
        vm.step();
    }
}

describe('sasm', () => {
    it('should compute a fibonacci sequence', () => {
        sasm(fibonacci, undefined, undefined, onCompile);
    })
})
