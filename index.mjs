import sasm from './sasm.mjs'
import parse from 'args-parser'
import fs from 'fs'

const args = parse(process.argv)
console.log(args)

const code = fs.readFileSync(args.file, 'utf-8')

const onCompile = (vm) => {
    while(true) {
        vm.step();
    }
}

sasm(code, undefined, undefined, onCompile);
