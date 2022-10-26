const https = require('https');
const http = require("http")

const hostname = '127.0.0.1';
const port = 3000;

// const server = https.createServer((req, res) => {
//     res.statusCode = 200;
//     res.setHeader('Content-Type', 'text/plain');
//     res.end('Hello World');
// });

// server.listen(port, hostname, () => {
//     console.log(`Server running at http://${hostname}:${port}/`);
// });

const recursionDepth = 10 // ile stron przechodzimy wgłąb
const recursionWidth = 50 // ile linków sprawdzamy z każdej strony
const maxWaitingTime = 40000
let checkedNumber = 0
let skippedNumber = 0

let xd = async () => {

    // let website = await getWebsite("https://tl.krakow.pl")
    // let mails = website.match(/\b\w+@\w+\.\w+\b/g)
    // let links = website.match(/(\b(http:\/\/|https:\/\/)?)(\w+?\.)+(org|com|pl|us|de)(\/\w+)*\b/g)
    // console.log("website: ", website);
    let mails = await findMails("https://tl.krakow.pl", [], recursionDepth)
    console.log("Ostatecza lista maili: ", mails);
    console.log("Liczba wykonanych zapytań: ", checkedNumber);
    console.log("Liczba pominiętych zapytań: ", skippedNumber);
    console.log("Liczba znalezionych maili: ", mails.length)
    //console.log("links: ", links);
}

const findMails = async (url, visitedLinksList, depth) => {
    return new Promise(async (resolve) => {
        //console.log("Przeglądam stronę(głębokość", depth, "): ", url);
        if (depth == 0 || visitedLinksList.includes(url)) {
            return resolve([])
        }
        let isTooLate = false
        let timeout = setTimeout(() => {
            isTooLate = true
            return resolve([])
        }, maxWaitingTime)
        let website = await getWebsite(url)
        clearTimeout(timeout)
        if (isTooLate) {
            skippedNumber++
            //console.log("Pomijam stronę: ", url);
            return resolve([])
        }
        checkedNumber++
        let result = website.match(/\b\w+@(\w+\.)+\w+\b/g)
        let mails = result ? [].concat(website.match(/\b\w+@(\w+\.)+(?!(png|jpg|xcf))\w+\b/g)) : []
        let links = website.match(/(\b(http:\/\/|https:\/\/)?)(\w+?\.)+(org|com|pl|us|de)(\/\w+)*\b/g)
        if (mails != null && mails.length > 0)
            console.log("Na stronie: ", url, " znaleziono maile: ", mails);
        //console.log("Znaleziono też linki do: ", links);

        if (links == null) {
            return resolve(mails)
        }
        // links.forEach(async (link, i) => {
        //     if (i > 10)
        //         return resolve([mails])
        //     mails = [].concat(await findMails(link, depth - 1), mails)
        //     if (i == links.lenght - 1) {
        //         return resolve(mails)
        //     }
        // })

        //odpalanie ściągania stron
        let mailPromises = []
        for (let i = 0; i < links.length; i++) {
            if (i < recursionWidth && !visitedLinksList.includes(links[i])) {
                mailPromises.push(findMails(links[i], visitedLinksList, depth - 1))
                visitedLinksList.push(links[i])
            }
        }
        // faktyczne przetwarzanie stron
        for (let i = 0; i < mailPromises.length; i++) {
            if (i < recursionWidth) {
                mails = [].concat(await mailPromises[i], mails)
            } else {
                //console.log("Odnaleziono zestaw maili: ", [... new Set(mails)]);
                return resolve([... new Set(mails)])
            }
        }
        //console.log("Odnaleziono zestaw maili: ", [... new Set(mails)]);
        return resolve([... new Set(mails)])

    })
}

const getWebsite = async (site) => {
    return new Promise(async (resolve) => {

        let protocol = ""
        if (site.slice(0, 8) == "https://")
            protocol = https
        else if (site.slice(0, 7) == "http://")
            protocol = http
        else {
            protocol = http
            site = "http://" + site
        }

        let website = ""
        protocol.get(site, (res) => {
            res.on('data', (d) => {
                website += d
            });

            res.on("end", () => {
                resolve(website)
            })

        }).on('error', (e) => {
            //console.error(e);
        });
    })
}

xd()