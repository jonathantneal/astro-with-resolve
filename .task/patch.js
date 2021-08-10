import { createHash } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { cwd } from 'process'

const main = () => {
	const root = new URL('../', import.meta.url)

	const patchForEsmDev = {
		file: new URL('node_modules/astro/dist/compiler/index.js', root),
		hash: {
			prior: '64cd1d9f6e98501461c2533e89788242',
			after: 'cb737375d01fd97cd1f2c665216400e7',
		},
		diff: [
			[1106, 1106, `import url from "url";\n`],
			[3552, 3552, (
				`  const fileID = path.join('/_astro', path.relative(projectRoot, filename));\n` +
				`  const fileURL = new URL(url.pathToFileURL(fileID).pathname, site);\n`
			)],
			[3998, 3998, (
				`  resolve(...segments) {\n` +
				`    return segments.reduce(\n` +
				`      (url, segment) => new URL(segment, url),\n` +
				`      new URL(\${JSON.stringify(fileURL)})\n` +
				`    ).pathname;\n` +
				`  },\n`
			)],
			[5102, 5102, (
				`    resolve: {\n` +
				`      value: (props[__astroContext] && props[__astroContext].resolve) || {},\n` +
				`      enumerable: true\n` +
				`    },\n`
			)],
			[6056, 6056, (
				`        resolve: __TopLevelAstro.resolve,\n`
			)],
		],
	}

	patchFileSync(
		patchForEsmDev.file,
		patchForEsmDev.hash.prior,
		patchForEsmDev.hash.after,
		...patchForEsmDev.diff
	)
}

const patchFileSync = (
	/** @type {URL} */
	fileURL,
	/** @type {string} */
	md5prior,
	/** @type {string} */
	md5after,
	/** @type {[number, number, string][]} */
	...diff
) => {
	const str = readFileSync(fileURL, 'utf8')
	const md5 = createHash('md5').update(str).digest('hex')
	const rel = fileURL.pathname.slice(new URL(cwd() + '/', 'file:').pathname.length)

	if (md5 === md5after) {
		console.log(`Successfully patched ${rel} (already). (${md5after})`)
	} else if (md5 === md5prior) {
		const strNext = diff.reduce(
			(
				patched,
				[lead, tail, text]
			) => patched.slice(0, lead) + text + patched.slice(tail),
			str
		)
		const md5Next = createHash('md5').update(strNext).digest('hex')

		writeFileSync(fileURL, strNext)

		console.log(`Successfully patched ${rel}. (${md5Next})`)
	} else {
		console.log(`Could not patch ${rel}. (${md5})`)
	}
}

main()
