// Add Anime in the list
const appToastQueue = [];
const maxVisibleAppToasts = 3;

function showAppToast(message, type = 'info') {
    appToastQueue.push({ message, type });
    displayQueuedAppToasts();
}

function displayQueuedAppToasts() {
    const container = document.getElementById('appToastContainer');
    if (!container) return;

    while (appToastQueue.length && container.children.length < maxVisibleAppToasts) {
        const { message, type } = appToastQueue.shift();
        const toast = document.createElement('div');
        toast.className = `app-toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        window.requestAnimationFrame(() => toast.classList.add('visible'));

        window.setTimeout(() => {
            toast.classList.remove('visible');
            window.setTimeout(() => {
                toast.remove();
                displayQueuedAppToasts();
            }, 300);
        }, 3600);
    }
}

function showConfirmDialog(message, title = 'Confirmer l’action', acceptLabel = 'Confirmer', variant = '') {
    return new Promise(resolve => {
        const dialog = document.getElementById('confirmDialog');
        const dialogCard = dialog?.querySelector('.confirm-dialog');
        const titleEl = document.getElementById('confirmDialogTitle');
        const messageEl = document.getElementById('confirmDialogMessage');
        const icon = dialog?.querySelector('.confirm-dialog-icon');
        const acceptLabelEl = document.getElementById('confirmAcceptLabel');
        const cancel = document.getElementById('confirmCancel');
        const accept = document.getElementById('confirmAccept');
        if (!dialog || !titleEl || !messageEl || !cancel || !accept) {
            resolve(false);
            return;
        }
        dialogCard?.classList.toggle('is-logout', variant === 'logout');
        dialog.classList.remove('is-logging-out');
        titleEl.textContent = title;
        messageEl.textContent = variant === 'logout' ? '' : message;
        if (icon) icon.textContent = variant === 'logout' ? 'logout' : 'warning';
        if (acceptLabelEl) acceptLabelEl.textContent = variant === 'logout' ? '' : acceptLabel;
        else accept.textContent = acceptLabel;
        accept.setAttribute('aria-label', variant === 'logout' ? 'Se déconnecter' : acceptLabel);
        dialog.hidden = false;
        const close = result => {
            dialog.hidden = true;
            dialogCard?.classList.remove('is-logout');
            dialog.classList.remove('is-logging-out');
            accept.disabled = false;
            cancel.disabled = false;
            cancel.removeEventListener('click', onCancel);
            accept.removeEventListener('click', onAccept);
            dialog.removeEventListener('click', onBackdropClick);
            document.removeEventListener('keydown', onKeyDown);
            resolve(result);
        };
        const onCancel = () => close(false);
        const onBackdropClick = event => {
            if (variant === 'logout' && event.target === dialog && !dialog.classList.contains('is-logging-out')) {
                close(false);
            }
        };
        const onKeyDown = event => {
            if (variant === 'logout' && event.key === 'Escape' && !dialog.classList.contains('is-logging-out')) {
                close(false);
            }
        };
        const onAccept = () => {
            if (variant !== 'logout') {
                close(true);
                return;
            }
            dialog.classList.add('is-logging-out');
            accept.disabled = true;
            cancel.disabled = true;
            window.setTimeout(() => close(true), 850);
        };
        cancel.addEventListener('click', onCancel);
        accept.addEventListener('click', onAccept);
        dialog.addEventListener('click', onBackdropClick);
        document.addEventListener('keydown', onKeyDown);
        (variant === 'logout' ? accept : cancel).focus();
    });
}

async function addAnime(idanime, urlimg, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepsaison, checkboxsf, duree, favori, flag, caption = '') {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    let nompref = "";
    if (languepref == 'EN') {
        nompref = nomenglish;
    } else {
        nompref = nomromaji;
    }
    let film = 0;
    if (checkboxsf==true) {
        film = 1;
    }
    if (nbsaisons=="") {
        nbsaisons = null;
        detailsepsaison = null;
    }
    if (detailsepsaison=="") {
        detailsepsaison = null;
    }
    let detailsadonner = detailsepsaison;
    if (detailsepsaison != null) {
        let newdetailsepsaison = '';
        let lstdetailsepsaison = detailsepsaison.split(',');
        if (lstdetailsepsaison.length != nbsaisons) {
            for (let i = 0; i < nbsaisons; i++) {
                if (i!=0) {
                    newdetailsepsaison += ',';
                }
                newdetailsepsaison += lstdetailsepsaison[i];
            }
            detailsadonner = newdetailsepsaison;
        }
    }

    let duplicateFound = false;
    let duplicateQuery = Supabase.from(tablename).select('id');
    if (Number(idanime) > 0) {
        duplicateQuery = duplicateQuery.eq('idanime', idanime);
    } else {
        duplicateQuery = duplicateQuery.eq('nompref', nompref);
    }
    const { data: duplicates, error: duplicateError } = await duplicateQuery;
    if (!duplicateError) {
        duplicateFound = Boolean(duplicates?.length);
    }

    if (duplicateFound) {
        const shouldContinue = await showConfirmDialog(
            `« ${nompref} » est déjà présent dans ta liste. Voulais-tu vraiment l’ajouter une seconde fois ?`,
            'Doublon détecté',
            'Ajouter quand même'
        );
        if (!shouldContinue) {
            showAppToast('Ajout annulé.', 'info');
            return false;
        }
    }

    const payload = {
            idanime: idanime, 
            urlimg: urlimg, 
            nomnative: nomnative, 
            nomromaji: nomromaji, 
            nomenglish: nomenglish, 
            languepref: languepref, 
            nompref: nompref,
            statut: statut, 
            nbsaisons: nbsaisons, 
            nbepisodes: nbepisodes, 
            saisonencours: saisonencours, 
            epencours: epencours, 
            detailsepparsaison: detailsadonner, 
            film: film, 
            duree: duree,
            favori: favori,
            flag: flag,
            caption: caption
        };
    let { data, error } = await Supabase.from(tablename).insert([payload]);
    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        delete payload.caption;
        ({ data, error } = await Supabase.from(tablename).insert([payload]));
        if (!error && caption) showAppToast('Anime ajouté, mais le synopsis nécessite la colonne caption.', 'warning');
    }
    if (error) {
        console.error(error);
        showAppToast('Impossible d’ajouter cet anime. Réessaie.', 'error');
        return false;
    }
    
    // document.querySelector("tbody").innerHTML = '';
    const activeFilter = sessionStorage.getItem('currentListFilter') || currentFilterValue;
    currentFilterValue = activeFilter;
    selectList(parseFilter(activeFilter));
    printCounts();
    showAppToast('Anime ajouté à ta liste.', 'success');
    return true;
}

function formatDurationFromMinutes(duration) {
    const minutes = Number(duration);
    if (!Number.isFinite(minutes) || minutes <= 0) return '00:00:00';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:00`;
}

function getDurationInMinutes(duration) {
    const value = String(duration ?? '').trim();
    if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value);
    const time = /^(\d+):([0-5]?\d)(?::\d+(?:\.\d+)?)?$/.exec(value);
    return time ? Number(time[1]) * 60 + Number(time[2]) : 0;
}

function openManualAddModal() {
    const modal = document.getElementById('animeForm-manual');
    if (!modal) return;
    modal.classList.add('show');
    document.getElementById('manual-title')?.focus();
}

function closeManualAddModal() {
    const modal = document.getElementById('animeForm-manual');
    if (!modal) return;
    modal.classList.remove('show');
    clearManualAddForm();
}

function toggleManualTypeFields() {
    const isFilm = document.getElementById('manual-is-film')?.checked;
    const episodesGroup = document.getElementById('manual-episodes-group');
    const durationGroup = document.getElementById('manual-duration-group');
    if (!episodesGroup || !durationGroup) return;
    episodesGroup.style.display = isFilm ? 'none' : 'flex';
    durationGroup.style.display = isFilm ? 'flex' : 'none';
}

function clearManualAddForm() {
    const form = document.getElementById('manualAddForm');
    const preview = document.getElementById('manual-image-preview');
    const previewWrap = document.getElementById('manual-image-preview-wrap');
    if (form) form.reset();
    if (preview) {
        preview.removeAttribute('src');
    }
    if (previewWrap) previewWrap.classList.remove('has-image');
    toggleManualTypeFields();
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function getManualImageValue() {
    const file = document.getElementById('manual-image-file')?.files?.[0];
    const url = document.getElementById('manual-image-url')?.value.trim() || '';
    if (!file) return url;
    // Un site statique ne peut pas écrire dans le dossier du dépôt : l’image reste donc dans la donnée enregistrée.
    return readFileAsDataUrl(file);
}

async function submitManualAdd() {
    const title = document.getElementById('manual-title')?.value.trim();
    const isFilm = document.getElementById('manual-is-film')?.checked || false;
    const episodes = Number(document.getElementById('manual-episodes')?.value) || 0;
    const duration = document.getElementById('manual-duration')?.value || '00:00';
    const favori = document.getElementById('manual-favorite')?.checked ? 1 : 0;
    const flag = document.getElementById('manual-flag')?.checked ? 1 : 0;

    if (!title) {
        document.getElementById('manual-title')?.focus();
        return;
    }
    if (!isFilm && episodes < 1) {
        document.getElementById('manual-episodes')?.focus();
        return;
    }
    if (isFilm && duration === '00:00') {
        document.getElementById('manual-duration')?.focus();
        return;
    }

    const imageUrl = await getManualImageValue();

    const addButton = document.querySelector('#animeForm-manual .add');
    if (addButton) {
        addButton.disabled = true;
        addButton.textContent = 'Ajout...';
    }
    const added = await addAnime(
        0,
        imageUrl,
        title,
        title,
        title,
        'EN',
        'toview',
        1,
        isFilm ? 0 : episodes,
        0,
        0,
        null,
        isFilm,
        isFilm ? `${duration}:00` : '00:00:00',
        favori,
        flag
    );
    if (addButton) {
        addButton.disabled = false;
        addButton.textContent = 'Ajouter';
    }
    if (!added) return;
    closeManualAddModal();
}

async function getUser(login, mdp) {
    const { data, error } = await Supabase
        .from('users')  
        .select('name, login')
        .eq('login', login)
        .eq('mdp', mdp);
    if (error) {
        console.error(error);
        return false;
    }
    if (!data || !data[0]) return false;
    
    setsess({
        nomsess: "username",
        valsess: data[0].name
    });
    setsess({
        nomsess: "accountLogin",
        valsess: data[0].login
    });
    return true;
}

let selectListRequestId = 0;

function awaitSupabaseQuery(query, timeoutMs = 12000) {
    let timeoutId;
    const timeout = new Promise(resolve => {
        timeoutId = window.setTimeout(() => {
            resolve({ data: null, error: new Error('La requête a expiré.') });
        }, timeoutMs);
    });
    return Promise.race([query, timeout]).finally(() => window.clearTimeout(timeoutId));
}

async function selectList(statsArray = ["toview", "next", "watching", "finished", "waiting", "dropped", "restart", "again"], orderby = "nompref", asc = true) {
    const requestId = ++selectListRequestId;
    if (!Array.isArray(statsArray)) {
        statsArray = [statsArray];
    }
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const markerFilters = (Array.isArray(window.currentMarkerFilter)
        ? window.currentMarkerFilter
        : String(window.currentMarkerFilter || '').split(','))
        .filter(filter => filter === 'favorite' || filter === 'flag');
    const grid = document.querySelector("#gridAnime");
    if (grid) {
        grid.innerHTML = '';
        grid.setAttribute('aria-busy', 'true');
        const appendSkeletonCards = count => {
            for (let index = 0; index < count; index++) {
                const skeleton = document.createElement('div');
                skeleton.className = 'anime-card anime-card-skeleton';
                skeleton.setAttribute('aria-hidden', 'true');
                skeleton.innerHTML = '<span class="skeleton-shine"></span><span class="skeleton-title"></span>';
                grid.appendChild(skeleton);
            }
        };
        const appendSkeletonSeparator = () => {
            const separator = document.createElement('div');
            separator.className = 'grid-letter-separator skeleton-separator';
            separator.setAttribute('aria-hidden', 'true');
            grid.appendChild(separator);
        };

        appendSkeletonCards(2);
        appendSkeletonSeparator();
        appendSkeletonCards(5);
        appendSkeletonSeparator();
        appendSkeletonCards(3);
        appendSkeletonSeparator();
        appendSkeletonCards(4);
        appendSkeletonSeparator();
        appendSkeletonCards(2);
        appendSkeletonSeparator();
        appendSkeletonCards(4);
    }
    
    let query = Supabase
        .from(tablename)  
        .select(`id, idanime, urlimg, nomnative, nomromaji, nomenglish, nompref, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepparsaison, film, duree, favori, flag`);
    
        if (statsArray.length > 0 && !statsArray.includes('favorite') && !statsArray.includes('flag')){
            query = query.in("statut", statsArray);
        }

        if (!markerFilters.length && statsArray.length === 1 && statsArray[0] === 'favorite') {
            query = query.eq('favori', 1);
        }
        if (!markerFilters.length && statsArray.length === 1 && statsArray[0] === 'flag') {
            query = query.eq('flag', 1);
        }
        if (markerFilters.includes('favorite')) query = query.eq('favori', 1);
        if (markerFilters.includes('flag')) query = query.eq('flag', 1);

        query = query.order(orderby, { ascending: asc });

        if (orderby != "nompref") {
            query = query.order('nompref', { ascending: asc });
        }

    let data;
    let error;
    try {
        ({ data, error } = await awaitSupabaseQuery(query));
    } catch (requestError) {
        error = requestError;
    }
    if (requestId !== selectListRequestId) return;
    if (error) {
        console.error(error);
        if (grid) {
            grid.innerHTML = '';
            grid.setAttribute('aria-busy', 'false');
            const retryNotice = document.createElement('div');
            retryNotice.className = 'list-load-error';
            retryNotice.setAttribute('role', 'alert');
            const message = document.createElement('p');
            message.textContent = 'Impossible de charger la liste. Vérifie ta connexion puis réessaie.';
            const retryButton = document.createElement('button');
            retryButton.type = 'button';
            retryButton.className = 'list-retry-button';
            retryButton.textContent = 'Réessayer';
            retryButton.addEventListener('click', () => {
                selectList(statsArray, orderby, asc);
            });
            retryNotice.append(message, retryButton);
            grid.appendChild(retryNotice);
        }
        return;
    }

    let recentItems = [];
    if (grid && !error) {
        let recentQuery = Supabase
            .from(tablename)
            .select(`id, idanime, urlimg, nompref, nomnative, nomromaji, statut, nbsaisons, nbepisodes, saisonencours, epencours, film, duree, favori, flag`);
        if (statsArray.length > 0 && !statsArray.includes('favorite') && !statsArray.includes('flag')) {
            recentQuery = recentQuery.in('statut', statsArray);
        }
        if (markerFilters.includes('favorite')) recentQuery = recentQuery.eq('favori', 1);
        if (markerFilters.includes('flag')) recentQuery = recentQuery.eq('flag', 1);
        let recentResult;
        try {
            recentResult = await awaitSupabaseQuery(recentQuery.order('id', { ascending: false }).limit(6));
        } catch (requestError) {
            recentResult = { data: null, error: requestError };
        }
        if (requestId !== selectListRequestId) return;
        if (!recentResult.error) {
            recentItems = recentResult.data || [];
        } else {
            console.error('Impossible de charger les ajouts récents :', recentResult.error);
            showAppToast('Les ajouts récents n’ont pas pu être chargés.', 'error');
        }
    }

    if (grid) {
        grid.innerHTML = '';
        grid.setAttribute('aria-busy', 'false');
    }

    if (grid && recentItems.length) {
            const recentSection = document.createElement('section');
            recentSection.className = 'recent-section';
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'recent-toggle';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<span>Récemment ajoutés</span><span class="material-symbols-rounded">expand_more</span>';
            const recentList = document.createElement('div');
            recentList.className = 'recent-list';
            recentItems.forEach(item => addAnimeCard({
                id: item.id, aniListId: item.idanime, img: item.urlimg, title: item.nompref, nativeTitle: item.nomnative,
                romajiTitle: item.nomromaji, saisons: item.nbsaisons,
                episodes: item.nbepisodes, status: item.statut, saisonencours: item.saisonencours,
                epencours: item.epencours, film: item.film, duree: item.duree,
                favori: item.favori, flag: item.flag
            }, recentList));
            toggle.addEventListener('click', () => {
                const expanded = recentSection.classList.toggle('expanded');
                toggle.setAttribute('aria-expanded', String(expanded));
                toggle.querySelector('.material-symbols-rounded').textContent = expanded ? 'expand_less' : 'expand_more';
            });
            recentSection.append(toggle, recentList);
            grid.appendChild(recentSection);
    }
    // console.log("SELECT:", datas);

    setsess({
        nomsess: "orderby",
        valsess: orderby
    })
    setsess({
        nomsess: "direction",
        valsess: asc
    })

    if(sessionStorage.getItem('orderby') == 'nompref'){
        setsess({
            nomsess: "letter",
            valsess: ""
        })
    }

    let currentGroup = '';
    (data || []).forEach(data_ => {
        const title = data_.nompref || '';
        const grid = document.querySelector('#gridAnime');
        if (orderby === 'nompref' && grid) {
            const firstChar = title.trim().charAt(0).toUpperCase();
            const group = /[A-Z]/.test(firstChar) ? firstChar : '#';
            if (group !== currentGroup) {
                currentGroup = group;
                const separator = document.createElement('div');
                separator.classList.add('grid-letter-separator');
                separator.textContent = group;
                grid.appendChild(separator);
            }
        }

        addAnimeCard({
            id: data_.id,
            aniListId: data_.idanime,
            img: data_.urlimg,
            title: data_.nompref,
            nativeTitle: data_.nomnative,
            romajiTitle: data_.nomromaji,
            saisons: data_.nbsaisons,
            episodes: data_.nbepisodes,
            status: data_.statut,
            saisonencours: data_.saisonencours,
            epencours: data_.epencours,
            film: data_.film,
            duree: data_.duree,
            favori: data_.favori,
            flag: data_.flag,
            caption: data_.caption
        });
    });   
    if (grid && !data?.length) {
        const emptyState = document.createElement('p');
        emptyState.className = 'list-empty-state';
        emptyState.textContent = markerFilters.includes('favorite') && markerFilters.includes('flag') ? 'Aucun anime favori et marqué dans cette catégorie.'
            : markerFilters.includes('favorite') ? 'Aucun anime en favori dans cette catégorie.'
            : markerFilters.includes('flag') ? 'Aucun anime marqué dans cette catégorie.'
            : statsArray.length === 1 && statsArray[0] === 'favorite' ? 'Aucun anime en favori.'
            : statsArray.length === 1 && statsArray[0] === 'flag' ? 'Aucun anime marqué.'
            : 'Aucun anime dans cette catégorie.';
        grid.appendChild(emptyState);
    }
}

async function logout() {
    const confirmed = await showConfirmDialog(
        '',
        'Se déconnecter ?',
        'Se déconnecter',
        'logout'
    );
    if (!confirmed) return;
    localStorage.removeItem('username');
    sessionStorage.clear();
    window.location.href = 'login.html';
}

function addAnimeCard({ id, aniListId, img, title, nativeTitle, romajiTitle, saisons, episodes, status, saisonencours, epencours, film, duree, favori, flag, caption }, targetGrid = null) {
    const grid = targetGrid || document.getElementById('gridAnime');
    if (!grid) return;

    const card = document.createElement('div');
    card.classList.add('anime-card');
    if (favori == 1) {
        card.classList.add('selected');
        card.classList.add('is-favorite');
    }
    if (flag == 1) {
        card.dataset.flag = '1';
        card.classList.add('is-flagged');
    }

    const image = document.createElement('img');
    image.src = img;
    image.alt = title;
    card.appendChild(image);

    const cardTop = document.createElement('div');
    cardTop.classList.add('card-top');

    const badges = document.createElement('div');
    badges.classList.add('card-badges');

    if (favori == 1) {
        const favoriteBadge = document.createElement('span');
        favoriteBadge.className = 'card-badge favorite';
        favoriteBadge.textContent = '★';
        badges.appendChild(favoriteBadge);
    }

    if (flag == 1) {
        const flagBadge = document.createElement('span');
        flagBadge.className = 'card-badge flag';
        flagBadge.textContent = '⚑';
        badges.appendChild(flagBadge);
    }

    if (badges.children.length) {
        cardTop.appendChild(badges);
    }

    const badge = document.createElement('span');
    if (film == 1) {
        badge.textContent = duree || 'Film';
    } else if (status === 'watching' && episodes) {
        const currentEpisode = Number(epencours) || 0;
        badge.textContent = `${currentEpisode} / ${episodes} Ep`;
    } else {
        badge.textContent = episodes ? `${episodes} Ep` : 'Épisodes inconnus';
    }
    cardTop.appendChild(badge);
    card.appendChild(cardTop);

    const cardBottom = document.createElement('div');
    cardBottom.classList.add('card-bottom');
    if (status === 'dropped') {
        const statusBadge = document.createElement('span');
        statusBadge.className = 'card-status card-status-dropped';
        statusBadge.textContent = 'Abandonné';
        cardBottom.appendChild(statusBadge);
    }
    const cardTitle = document.createElement('h3');
    cardTitle.textContent = title;
    cardBottom.appendChild(cardTitle);
    card.appendChild(cardBottom);

    card.addEventListener('click', () => {
        showCardInfo({
            id,
            aniListId,
            img,
            title,
            nativeTitle,
            romajiTitle,
            saisons,
            episodes,
            status,
            saisonencours,
            epencours,
            film,
            duree,
            favori,
            flag,
            caption
        });
    });

    grid.appendChild(card);
}

const kurolisteAniListDetailsCache = new Map();
const kurolisteAniListDetailsRequests = new Map();
let cardInfoRequestId = 0;
let cardInfoSynopsisRequestId = 0;
let cardInfoSynopsisOriginal = '';
let cardInfoSynopsisTranslated = false;

const KUROLISTE_ANILIST_DETAILS_QUERY = `query ($id: Int) {
    Media(id: $id, type: ANIME) {
        id
        title {
            romaji
            english
            native
        }
        coverImage {
            extraLarge
            large
            medium
        }
        format
        status
        episodes
        duration
        season
        seasonYear
        startDate {
            year
            month
            day
        }
        genres
        averageScore
        source
        description
        studios(isMain: true) {
            nodes {
                name
            }
        }
        trailer {
            id
            site
        }
        siteUrl
        nextAiringEpisode {
            episode
            airingAt
        }
    }
}`;

async function getKurolisteAniListDetails(animeId) {
    const id = Number(animeId);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    if (kurolisteAniListDetailsCache.has(id)) return kurolisteAniListDetailsCache.get(id);
    if (kurolisteAniListDetailsRequests.has(id)) return kurolisteAniListDetailsRequests.get(id);

    const request = requestAniList(KUROLISTE_ANILIST_DETAILS_QUERY, { id })
        .then(data => {
            const media = data?.Media;
            if (!media) throw new Error(`AniList ne connaît pas l’anime ${id}.`);
            kurolisteAniListDetailsCache.set(id, media);
            return media;
        })
        .finally(() => kurolisteAniListDetailsRequests.delete(id));
    kurolisteAniListDetailsRequests.set(id, request);
    return request;
}

function appendCardInfoRow(container, label, value) {
    if (!value) return;
    const row = document.createElement('div');
    row.className = 'card-info-row';
    const rowLabel = document.createElement('span');
    rowLabel.textContent = label;
    const rowValue = document.createElement('span');
    rowValue.textContent = value;
    row.append(rowLabel, rowValue);
    container.appendChild(row);
}

function resetCardInfoSynopsis(description) {
    const overlay = document.getElementById('cardInfoOverlay');
    const synopsis = (description || '').trim();
    const synopsisElement = overlay?.querySelector('.card-info-description');
    const synopsisToggle = overlay?.querySelector('.card-info-synopsis .kurocal-synopsis-toggle');
    const translateButton = overlay?.querySelector('.card-info-synopsis .kurocal-translate-button');
    const toggleLabel = synopsisToggle?.querySelector('span:last-child');
    const toggleIcon = synopsisToggle?.querySelector('.material-symbols-rounded');
    const translateLabel = translateButton?.querySelector('span:last-child');
    if (!synopsisElement || !synopsisToggle || !translateButton || !toggleLabel || !toggleIcon || !translateLabel) return;

    cardInfoSynopsisRequestId++;
    cardInfoSynopsisOriginal = synopsis;
    cardInfoSynopsisTranslated = false;
    synopsisElement.textContent = synopsis || 'Aucun synopsis fourni sur AniList.';
    synopsisElement.hidden = false;
    synopsisElement.classList.remove('is-expanded', 'is-unavailable');
    synopsisElement.classList.toggle('is-unavailable', !synopsis);
    synopsisToggle.hidden = true;
    synopsisToggle.setAttribute('aria-expanded', 'false');
    toggleLabel.textContent = 'Lire la suite';
    toggleIcon.textContent = 'expand_more';
    translateButton.hidden = !synopsis || synopsis.length < 3;
    translateButton.disabled = false;
    translateLabel.textContent = 'Traduire en français';

    synopsisToggle.onclick = () => {
        const expanded = synopsisElement.classList.toggle('is-expanded');
        synopsisToggle.setAttribute('aria-expanded', String(expanded));
        toggleLabel.textContent = expanded ? 'Réduire' : 'Lire la suite';
        toggleIcon.textContent = expanded ? 'expand_less' : 'expand_more';
    };
    translateButton.onclick = async () => {
        if (cardInfoSynopsisTranslated) {
            cardInfoSynopsisTranslated = false;
            synopsisElement.textContent = cardInfoSynopsisOriginal;
            synopsisElement.classList.remove('is-expanded');
            synopsisToggle.setAttribute('aria-expanded', 'false');
            toggleLabel.textContent = 'Lire la suite';
            toggleIcon.textContent = 'expand_more';
            translateLabel.textContent = 'Traduire en français';
            window.requestAnimationFrame(() => updateCardInfoSynopsisControls(synopsisElement, synopsisToggle));
            return;
        }

        if (cardInfoSynopsisOriginal.length > 5000) {
            showAppToast('Ce synopsis dépasse la limite gratuite de traduction.', 'warning');
            return;
        }

        const requestId = ++cardInfoSynopsisRequestId;
        const cacheKey = `${overlay.dataset.cardId}:${cardInfoSynopsisOriginal}`;
        let translated = kurocalSynopsisTranslationCache.get(cacheKey);
        translateButton.disabled = true;
        translateLabel.textContent = 'Traduction…';
        try {
            if (!translated) {
                translated = await translateKurocalSynopsis(cardInfoSynopsisOriginal);
                kurocalSynopsisTranslationCache.set(cacheKey, translated);
            }
            if (requestId !== cardInfoSynopsisRequestId || overlay.classList.contains('hidden')) return;
            cardInfoSynopsisTranslated = true;
            synopsisElement.textContent = translated;
            synopsisElement.classList.remove('is-expanded');
            synopsisToggle.setAttribute('aria-expanded', 'false');
            toggleLabel.textContent = 'Lire la suite';
            toggleIcon.textContent = 'expand_more';
            translateLabel.textContent = 'Afficher l’original';
            window.requestAnimationFrame(() => updateCardInfoSynopsisControls(synopsisElement, synopsisToggle));
        } catch (error) {
            if (requestId !== cardInfoSynopsisRequestId) return;
            console.error('Impossible de traduire le synopsis de la Kuroliste :', error);
            showAppToast('La traduction est indisponible pour le moment. Réessaie plus tard.', 'error');
            translateLabel.textContent = 'Traduire en français';
        } finally {
            if (requestId === cardInfoSynopsisRequestId) translateButton.disabled = false;
        }
    };
    window.requestAnimationFrame(() => updateCardInfoSynopsisControls(synopsisElement, synopsisToggle));
}

function updateCardInfoSynopsisControls(description, toggle) {
    if (!description || !toggle || description.hidden || description.classList.contains('is-expanded')) {
        if (toggle) toggle.hidden = true;
        return;
    }
    toggle.hidden = description.scrollHeight <= description.clientHeight + 1;
}

function renderKurolisteAniListDetails(details, requestId) {
    const overlay = document.getElementById('cardInfoOverlay');
    if (!overlay || requestId !== cardInfoRequestId || overlay.classList.contains('hidden')) return;

    const image = overlay.querySelector('.card-info-image img');
    const detailsEl = overlay.querySelector('.card-info-details');
    const trailerContainer = overlay.querySelector('.card-info-trailer');
    const title = details.title?.english || details.title?.romaji || details.title?.native || '';
    const cover = details.coverImage?.extraLarge || details.coverImage?.large || details.coverImage?.medium;
    if (cover && !image.getAttribute('src')) image.src = cover;
    if (title) image.alt = title;

    const chips = [];
    if (details.genres?.length) chips.push(...details.genres);
    const formatLabels = {
        TV: 'Série TV',
        TV_SHORT: 'Série courte',
        MOVIE: 'Film',
        SPECIAL: 'Spécial',
        OVA: 'OVA',
        ONA: 'ONA',
        MUSIC: 'Clip musical'
    };
    if (details.format) chips.push(formatLabels[details.format] || details.format.replaceAll('_', ' '));
    if (details.episodes) chips.push(`${details.episodes} épisodes`);
    if (details.duration) chips.push(`${details.duration} min / épisode`);
    const seasonLabels = { WINTER: 'Hiver', SPRING: 'Printemps', SUMMER: 'Été', FALL: 'Automne' };
    if (details.season && details.seasonYear) chips.push(`${seasonLabels[details.season] || details.season} ${details.seasonYear}`);
    if (details.averageScore) chips.push(`Note AniList ${details.averageScore}/100`);

    detailsEl.replaceChildren();
    chips.forEach((value, index) => {
        const chip = document.createElement('span');
        chip.className = index < (details.genres?.length || 0) ? 'kurocal-info-chip genre' : 'kurocal-info-chip';
        chip.textContent = value;
        detailsEl.appendChild(chip);
    });
    appendCardInfoRow(detailsEl, 'Nom japonais romaji', details.title?.romaji);
    appendCardInfoRow(detailsEl, 'Nom japonais natif', details.title?.native);
    const source = details.source ? details.source.replaceAll('_', ' ').toLowerCase() : '';
    appendCardInfoRow(detailsEl, 'Source', source ? source.charAt(0).toLocaleUpperCase('fr-FR') + source.slice(1) : '');
    appendCardInfoRow(detailsEl, 'Studio', details.studios?.nodes?.map(studio => studio.name).filter(Boolean).join(', '));
    const airingStatusLabels = {
        FINISHED: 'Diffusion terminée',
        RELEASING: 'En cours de diffusion',
        NOT_YET_RELEASED: 'Pas encore diffusé',
        CANCELLED: 'Diffusion annulée',
        HIATUS: 'En pause'
    };
    appendCardInfoRow(detailsEl, 'Statut de diffusion', airingStatusLabels[details.status] || details.status?.replaceAll('_', ' '));
    if (details.startDate?.year) {
        const date = new Intl.DateTimeFormat('fr-FR', {
            day: details.startDate.day ? 'numeric' : undefined,
            month: details.startDate.month ? 'long' : undefined,
            year: 'numeric'
        }).format(new Date(details.startDate.year, (details.startDate.month || 1) - 1, details.startDate.day || 1));
        appendCardInfoRow(detailsEl, 'Date de début', date);
    }

    const description = (details.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&#39;|&quot;|&amp;|&lt;|&gt;/gi, entity => ({
        '&#39;': "'",
        '&quot;': '"',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>'
    })[entity.toLowerCase()] || entity).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    resetCardInfoSynopsis(description);

    trailerContainer.replaceChildren();
    trailerContainer.hidden = true;
    if (details.trailer?.site?.toLowerCase() === 'youtube' && details.trailer.id) {
        const heading = document.createElement('h3');
        heading.textContent = 'Bande-annonce';
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(details.trailer.id)}`;
        iframe.title = `Bande-annonce de ${title || image.alt}`;
        iframe.loading = 'lazy';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        trailerContainer.append(heading, iframe);
        trailerContainer.hidden = false;
    }
}

function showCardInfo({ id, aniListId, img, title, nativeTitle, romajiTitle, saisons, episodes, status, saisonencours, epencours, film, duree, favori, flag, caption }, options = {}) {
    const { isSearchResult = false, searchData = null } = options;
    const overlay = document.getElementById('cardInfoOverlay');
    if (!overlay) return;
    const requestId = ++cardInfoRequestId;

    const image = overlay.querySelector('.card-info-image img');
    const titleEl = overlay.querySelector('.card-info-header h2');
    const statusEl = overlay.querySelector('.card-info-status');
    const progressBand = overlay.querySelector('.card-info-progress-band');
    const detailsEl = overlay.querySelector('.card-info-details');
    const descriptionEl = overlay.querySelector('.card-info-description');
    const trailerContainer = overlay.querySelector('.card-info-trailer');
    const synopsisToggle = overlay.querySelector('.card-info-synopsis .kurocal-synopsis-toggle');
    const translateButton = overlay.querySelector('.card-info-synopsis .kurocal-translate-button');
    const addButton = overlay.querySelector('.card-info-add-btn');
    const progressButton = overlay.querySelector('.card-info-progress-btn');
    const editButton = overlay.querySelector('.card-info-edit-btn');
    const finishButton = overlay.querySelector('.card-info-finish-btn');
    const aniListButton = overlay.querySelector('.card-info-anilist-btn');

    image.src = img || '';
    image.alt = title || '';
    titleEl.textContent = title || 'Sans titre';
    const statusLabels = {
        toview: 'À voir',
        next: 'Suivant',
        watching: 'En cours',
        finished: 'Terminé',
        waiting: 'En attente',
        dropped: 'Abandonné',
        restart: 'Recommencer',
        again: 'À revoir'
    };
    statusEl.textContent = statusLabels[status] || status || 'Statut inconnu';
    statusEl.className = `card-info-status status-${status || 'unknown'}`;

    const effectiveType = (searchData?.type === 'Film' || film == 1) ? 'Film' : 'Série';
    const durationValue = getDurationInMinutes(searchData?.duration || duree);
    const episodeValue = Number(searchData?.nbepisodes || episodes || 0);

    const chips = [];
    chips.push(effectiveType);
    if (effectiveType === 'Film') {
        chips.push(durationValue ? `${durationValue} min` : 'Durée inconnue');
    } else {
        chips.push(episodeValue ? `${episodeValue} épisodes` : 'Épisodes inconnus');
        if (Number(saisons) > 1) chips.push(`${saisons} saisons`);
    }
    if (favori == 1) chips.push('Favori');
    if (flag == 1) chips.push('Important');

    detailsEl.replaceChildren();
    chips.forEach(value => {
        const chip = document.createElement('span');
        chip.className = 'kurocal-info-chip';
        chip.textContent = value;
        detailsEl.appendChild(chip);
    });

    const rows = [
        { label: 'Nom japonais romaji', value: searchData?.romajiTitle || romajiTitle || '' },
        { label: 'Nom japonais natif', value: searchData?.nativeTitle || nativeTitle || '' }
    ];
    rows.forEach(({ label, value }) => {
        if (!value || value === title) return;
        const row = document.createElement('div');
        row.className = 'card-info-row';
        const rowLabel = document.createElement('span');
        rowLabel.textContent = label;
        const rowValue = document.createElement('span');
        rowValue.textContent = value;
        row.append(rowLabel, rowValue);
        detailsEl.appendChild(row);
    });

    const description = (searchData?.description || caption || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    resetCardInfoSynopsis(description);
    if (!description && isSearchResult) descriptionEl.hidden = true;
    const mediaAniListId = Number(searchData?.id || aniListId);
    if (!description && !isSearchResult && Number.isSafeInteger(mediaAniListId) && mediaAniListId > 0) {
        descriptionEl.textContent = 'Chargement des informations AniList…';
        descriptionEl.classList.add('is-unavailable');
        synopsisToggle.hidden = true;
        translateButton.hidden = true;
    }
    if (trailerContainer) {
        trailerContainer.replaceChildren();
        trailerContainer.hidden = true;
    }
    if (aniListButton) {
        aniListButton.classList.toggle('hidden', !Number.isSafeInteger(mediaAniListId) || mediaAniListId <= 0);
        aniListButton.onclick = () => openAniListDetails(mediaAniListId);
    }

    progressBand.replaceChildren();
    const progressEpisode = Number(epencours) || 0;
    const canShowProgress = !isSearchResult && status !== 'finished' && effectiveType !== 'Film' &&
        ['watching', 'waiting', 'dropped', 'restart', 'again'].includes(status) &&
        (progressEpisode > 0 || episodeValue > 0);
    progressBand.hidden = !canShowProgress;
    if (canShowProgress) {
        const icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'play_circle';
        const progressText = document.createElement('span');
        progressText.className = 'card-info-progress-text';
        const progressLabel = document.createElement('small');
        progressLabel.textContent = 'Ta progression';
        const progressValue = document.createElement('strong');
        const seasonLabel = Number(saisons) > 1 && Number(saisonencours) > 0
            ? `Saison ${saisonencours} · `
            : '';
        progressValue.textContent = `${seasonLabel}Épisode ${progressEpisode}${episodeValue ? ` / ${episodeValue}` : ''}`;
        progressText.append(progressLabel, progressValue);
        progressBand.append(icon, progressText);
    }

    if (isSearchResult && addButton) {
        addButton.classList.remove('hidden');
        if (editButton) editButton.classList.add('hidden');
        if (progressButton) progressButton.classList.add('hidden');
        if (finishButton) finishButton.classList.add('hidden');
        addButton.disabled = false;
            addButton.textContent = 'Ajouter à la liste';
        addButton.onclick = async () => {
            addButton.disabled = true;
            addButton.textContent = 'Ajout...';
            const nbepisodes = Number(searchData?.nbepisodes || episodes || 0);
            const languepref = 'EN';
            const statut = 'toview';
            const nbsaisons = 1;
            const detailsepsaison = '';
            const isMovie = (searchData?.type === 'Film') || (film == 1);
            const dureeVal = isMovie ? formatDurationFromMinutes(searchData?.duration || duree) : '00:00:00';
            const filmFlag = isMovie ? true : false;
            const added = await addAnime(
                searchData?.id || id,
                searchData?.coverImage || img || '',
                searchData?.nativeTitle || '',
                searchData?.romajiTitle || title || '',
                searchData?.englishTitle || title || '',
                languepref,
                statut,
                nbsaisons,
                nbepisodes,
                0,
                0,
                detailsepsaison,
                filmFlag,
                dureeVal,
                0,
                0,
                searchData?.description || ''
            );
            addButton.textContent = added ? 'Ajouté' : 'Réessayer';
            addButton.disabled = false;
        };
        overlay.dataset.cardId = '';
    } else {
        if (addButton) addButton.classList.add('hidden');
        if (editButton) editButton.classList.remove('hidden');
        if (finishButton) {
            finishButton.classList.toggle('hidden', isSearchResult || status === 'finished');
            finishButton.setAttribute('aria-label', 'Marquer comme vu');
            finishButton.title = 'Marquer comme vu';
            finishButton.disabled = false;
            finishButton.onclick = async () => {
                finishButton.disabled = true;
                const updated = await markAnimeFinished(id);
                if (updated) hideCardInfo();
                else finishButton.disabled = false;
            };
        }
        if (progressButton) {
            const canAdvance = film != 1 && status === 'watching';
            const canStart = film != 1 && status !== 'watching' && status !== 'finished';
            progressButton.classList.toggle('hidden', !canAdvance && !canStart);
            progressButton.textContent = canStart ? 'Marquer comme commencé' : 'Épisode suivant';
            progressButton.onclick = async () => {
                progressButton.disabled = true;
                const updated = await updateEp(
                    id,
                    canStart ? 1 : (Number(epencours) || 0) + 1,
                    saisonencours || 1,
                    'watching'
                );
                progressButton.disabled = false;
                if (updated) hideCardInfo();
            };
        }
        overlay.dataset.cardId = id;
    }

    overlay.classList.remove('hidden');
    if (!isSearchResult && Number.isSafeInteger(mediaAniListId) && mediaAniListId > 0) {
        getKurolisteAniListDetails(mediaAniListId)
            .then(details => renderKurolisteAniListDetails(details, requestId))
            .catch(error => {
                if (requestId !== cardInfoRequestId || overlay.classList.contains('hidden')) return;
                console.error(`Impossible de charger les détails AniList de l’anime ${mediaAniListId} :`, error);
                if (!description) {
                    descriptionEl.textContent = 'Les informations AniList sont indisponibles pour le moment.';
                    descriptionEl.hidden = false;
                    descriptionEl.classList.add('is-unavailable');
                    synopsisToggle.hidden = true;
                    translateButton.hidden = true;
                }
                showAppToast('Impossible de charger les détails AniList de cet anime.', 'error');
            });
    } else if (!isSearchResult && !description) {
        descriptionEl.textContent = 'Aucun synopsis enregistré et aucun identifiant AniList pour récupérer les détails.';
        descriptionEl.hidden = false;
        descriptionEl.classList.add('is-unavailable');
        synopsisToggle.hidden = true;
        translateButton.hidden = true;
    }
}

function hideCardInfo() {
    cardInfoRequestId++;
    cardInfoSynopsisRequestId++;
    const overlay = document.getElementById('cardInfoOverlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
}

let animeDetailsReturnView = 'gridAnime';
let animePlayerReturnView = 'animeDetailsView';
let animePlayerCurrentEpisode = 0;
let animePlayerEpisodes = [];
let animeStreamEpisodes = [];
let animeStreamRequestStatus = 'idle';
let animeStreamRequestError = '';
let animeStreamRequestPromise = null;
let animeStreamRequestId = 0;
let animePlayerLoadId = 0;

const ANIME_STREAM_API_BASE_URL = 'https://kuroni-api.duckdns.org';
const ANILIST_STREAM_OVERRIDES = {
    // Add an AniList ID to override the API's exact title, season/part and language:
    // '12345': { name: 'Exact API title', season: 'saison2-part2', version: 'vostfr' }
};
const ANIME_TITLE_STREAM_OVERRIDES = {
    // Optional exact AniList title overrides when an ID-specific entry is inconvenient:
    // 'Gate 2': { name: 'Gate', season: 'saison2' }
};
const animeStreamEpisodesCache = new Map();
const animeStreamEpisodesRequests = new Map();

function getReleasedAniListEpisodeCount(details) {
    if (details.status === 'RELEASING') {
        const nextEpisode = Number(details.nextAiringEpisode?.episode);
        return Number.isSafeInteger(nextEpisode) && nextEpisode > 0 ? Math.max(0, nextEpisode - 1) : null;
    }
    if (details.status === 'FINISHED') {
        if (details.episodes == null) return null;
        const totalEpisodes = Number(details.episodes);
        return Number.isSafeInteger(totalEpisodes) && totalEpisodes >= 0 ? totalEpisodes : null;
    }
    if (details.status === 'NOT_YET_RELEASED') return 0;
    return null;
}

function appendAniListDetailMeta(container, label, value) {
    if (!value) return;
    const item = document.createElement('span');
    item.className = 'anime-details-chip';
    item.textContent = `${label} : ${value}`;
    container.appendChild(item);
}

function normalizeAnimeSeasonNumber(value) {
    const normalized = String(value).toLowerCase();
    const wordNumbers = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
    if (wordNumbers[normalized]) return wordNumbers[normalized];
    if (/^\d+$/.test(normalized)) return Number(normalized);
    const romanNumbers = { i: 1, ii: 2, iii: 3, iv: 4 };
    return romanNumbers[normalized] || null;
}

function inferAnimeApiTitleAndSeason(title) {
    const normalizedTitle = String(title || '').trim();
    const seasonPattern = /(?:\b(?:season|saison)\s*(\d+|i{1,3}|iv)\b|\b(first|second|third|fourth|fifth|\d+(?:st|nd|rd|th))\s+season\b)/i;
    const seasonMatch = seasonPattern.exec(normalizedTitle);
    let name = normalizedTitle;
    let seasonNumber = 1;
    let suffix = '';

    if (seasonMatch) {
        const marker = seasonMatch[0];
        const seasonValue = seasonMatch[1] || seasonMatch[2].replace(/(\d+)(?:st|nd|rd|th)$/i, '$1');
        seasonNumber = normalizeAnimeSeasonNumber(seasonValue) || 1;
        name = normalizedTitle.slice(0, seasonMatch.index).replace(/[\s\-–—:]+$/, '').trim();
        suffix = normalizedTitle.slice(seasonMatch.index + marker.length);
    }

    const partPattern = /\b(?:part|partie|cour)\s*(\d+|i{1,3}|iv)\b/i;
    const partMatch = partPattern.exec(suffix || normalizedTitle);
    if (!seasonMatch && partMatch) {
        name = normalizedTitle.slice(0, partMatch.index).replace(/[\s\-–—:]+$/, '').trim();
    }
    const partNumber = partMatch ? normalizeAnimeSeasonNumber(partMatch[1]) : null;

    if (!seasonMatch && !partMatch) {
        const sequelTitle = normalizedTitle.match(/^(.+?)[\s\-–—:]+(second|third|fourth|fifth|(?:2|3|4|5|6|7|8|9|10)(?:st|nd|rd|th)?)$/i);
        if (sequelTitle) {
            const sequelValue = sequelTitle[2].replace(/(\d+)(?:st|nd|rd|th)$/i, '$1');
            const sequelNumber = normalizeAnimeSeasonNumber(sequelValue);
            if (sequelNumber) {
                name = sequelTitle[1].trim();
                seasonNumber = sequelNumber;
            }
        }
    }

    return {
        name: name || normalizedTitle,
        season: `saison${seasonNumber}${partNumber ? `-part${partNumber}` : ''}`
    };
}

function getAnimeStreamRequest(details) {
    const defaultName = details.title?.romaji || details.title?.romaji || details.title?.native || '';
    const inferred = inferAnimeApiTitleAndSeason(defaultName);
    const override = ANILIST_STREAM_OVERRIDES[String(details.id)] ||
        ANIME_TITLE_STREAM_OVERRIDES[defaultName] ||
        {};
    return {
        name: override.name || inferred.name,
        season: override.season || inferred.season,
        version: override.version || 'vostfr'
    };
}

async function fetchAnimeStreamEpisodes(details) {
    const request = getAnimeStreamRequest(details);
    if (!request.name) throw new Error('AniList ne fournit aucun titre pour construire la requête.');
    const cacheKey = `${request.name}\u0000${request.season}\u0000${request.version}`;
    if (animeStreamEpisodesCache.has(cacheKey)) return animeStreamEpisodesCache.get(cacheKey);
    if (animeStreamEpisodesRequests.has(cacheKey)) return animeStreamEpisodesRequests.get(cacheKey);

    const query = new URLSearchParams({
        n: request.name,
        s: request.season,
        v: request.version
    }).toString().replace(/\+/g, '%20');
    const apiBase = ANIME_STREAM_API_BASE_URL.replace(/\/+$/, '');
    if (window.location.protocol === 'https:' && apiBase.startsWith('http://')) {
        throw new Error('GitHub Pages exige une API accessible en HTTPS. Configure une URL HTTPS pour ton serveur.');
    }
    const promise = fetch(`${apiBase}/api/getAnimeLink?${query}`, {
        headers: { Accept: 'application/json' }
    }).then(async response => {
        let payload;
        try {
            payload = await response.json();
        } catch (error) {
            throw new Error(`L’API n’a pas renvoyé du JSON valide (HTTP ${response.status}).`, { cause: error });
        }
        if (!response.ok) {
            const reason = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
            throw new Error(`L’API de lecture a répondu : ${reason}`);
        }
        if (!Array.isArray(payload)) throw new TypeError('La réponse de l’API doit être une liste JSON d’épisodes.');

        const episodesByNumber = new Map();
        payload.forEach((item, index) => {
            if (!Number.isSafeInteger(item?.episode) || item.episode < 0 || typeof item.url !== 'string' || !item.url.trim()) {
                throw new TypeError(`L’épisode reçu à la position ${index + 1} ne contient pas un numéro et une URL valides.`);
            }
            const source = new URL(item.url.trim(), `${apiBase}/`);
            if (!['http:', 'https:'].includes(source.protocol)) {
                throw new TypeError(`L’URL reçue pour l’épisode ${item.episode + 1} n’est pas une URL HTTP(S).`);
            }
            if (window.location.protocol === 'https:' && source.protocol !== 'https:') {
                throw new Error('Les fichiers vidéo doivent aussi être accessibles en HTTPS depuis GitHub Pages.');
            }
            const displayedEpisode = item.episode + 1;
            if (!episodesByNumber.has(displayedEpisode)) {
                episodesByNumber.set(displayedEpisode, {
                    episode: displayedEpisode,
                    sourceUrl: source.href
                });
            }
        });
        const episodes = [...episodesByNumber.values()].sort((left, right) => left.episode - right.episode);
        animeStreamEpisodesCache.set(cacheKey, episodes);
        return episodes;
    }).finally(() => animeStreamEpisodesRequests.delete(cacheKey));
    animeStreamEpisodesRequests.set(cacheKey, promise);
    return promise;
}

function showAnimePlayerState(state, message) {
    const overlay = document.getElementById('animePlayerLoading');
    const label = document.getElementById('animePlayerLoadingMessage');
    const video = document.querySelector('.anime-player-stage video');
    if (!overlay || !label || !video) return;
    overlay.hidden = false;
    overlay.classList.toggle('is-error', state === 'error');
    overlay.querySelector('.anime-player-spinner')?.toggleAttribute('hidden', state !== 'loading');
    label.textContent = message;
}

function loadAnimePlayerEpisode(episode) {
    const video = document.querySelector('.anime-player-stage video');
    const overlay = document.getElementById('animePlayerLoading');
    if (!video || !overlay) return;
    const loadId = ++animePlayerLoadId;
    animePlayerCurrentEpisode = episode;
    updateAnimePlayerEpisodeNavigation();
    video.pause();
    video.removeAttribute('src');
    video.load();
    showAnimePlayerState('loading', 'Récupération du lien vidéo…');

    if (animeStreamRequestStatus === 'loading' && animeStreamRequestPromise) {
        animeStreamRequestPromise.then(() => {
            if (loadId !== animePlayerLoadId) return;
            loadAnimePlayerEpisodeSource(episode, loadId);
        }).catch(error => {
            if (loadId !== animePlayerLoadId) return;
            showAnimePlayerState('error', `Impossible de récupérer les épisodes : ${error.message}`);
        });
        return;
    }
    if (animeStreamRequestStatus === 'error') {
        showAnimePlayerState('error', animeStreamRequestError || 'Impossible de récupérer les épisodes.');
        return;
    }
    loadAnimePlayerEpisodeSource(episode, loadId);
}

function loadAnimePlayerEpisodeSource(episode, loadId) {
    const video = document.querySelector('.anime-player-stage video');
    const record = animeStreamEpisodes.find(item => item.episode === episode);
    if (!video || !record) {
        showAnimePlayerState('error', `Aucun lien vidéo disponible pour l’épisode ${episode}.`);
        return;
    }
    video.oncanplay = () => {
        if (loadId === animePlayerLoadId) document.getElementById('animePlayerLoading').hidden = true;
    };
    video.onerror = () => {
        if (loadId === animePlayerLoadId) {
            showAnimePlayerState('error', 'La vidéo ne peut pas être lue. Vérifie le format et l’URL du fichier.');
        }
    };
    video.src = record.sourceUrl;
    video.load();
    showAnimePlayerState('loading', 'Chargement de la vidéo…');
}

function openAnimePlayer(episode) {
    const title = document.getElementById('animeDetailsTitle')?.textContent || 'Anime';
    animePlayerReturnView = 'animeDetailsView';
    document.getElementById('animePlayerTitle').textContent = title;
    showView('animePlayerView');
    loadAnimePlayerEpisode(episode);
}

function updateAnimePlayerEpisodeNavigation() {
    const episodeLabel = document.getElementById('animePlayerEpisode');
    const previousButton = document.getElementById('animePlayerPrevious');
    const nextButton = document.getElementById('animePlayerNext');
    if (!episodeLabel || !previousButton || !nextButton) return;
    episodeLabel.textContent = `ÉPISODE ${animePlayerCurrentEpisode}`;
    const episodeIndex = animePlayerEpisodes.findIndex(item => item.episode === animePlayerCurrentEpisode);
    previousButton.disabled = episodeIndex <= 0;
    nextButton.disabled = episodeIndex < 0 || episodeIndex >= animePlayerEpisodes.length - 1;
}

function changeAnimePlayerEpisode(offset) {
    const currentIndex = animePlayerEpisodes.findIndex(item => item.episode === animePlayerCurrentEpisode);
    const nextItem = animePlayerEpisodes[currentIndex + offset];
    if (!nextItem) return;
    loadAnimePlayerEpisode(nextItem.episode);
}

function closeEmptyAnimePlayer() {
    showView(animePlayerReturnView);
}

function renderAniListEpisodeList(episodes) {
    const list = document.querySelector('#animeDetailsEpisodeList ol');
    if (!list) return;
    const fragment = document.createDocumentFragment();
    episodes.forEach(({ episode }) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'anime-details-episode-button';
        button.textContent = `Épisode ${episode}`;
        button.addEventListener('click', () => openAnimePlayer(episode));
        item.appendChild(button);
        fragment.appendChild(item);
    });
    list.replaceChildren(fragment);
}

function updateAniListEpisodeList(episodes, message) {
    const summary = document.getElementById('animeDetailsEpisodeSummary');
    const episodeList = document.getElementById('animeDetailsEpisodeList');
    if (!summary || !episodeList) return;
    summary.textContent = message;
    if (episodes.length) {
        episodeList.hidden = false;
        episodeList.open = false;
        episodeList.dataset.loaded = 'true';
        episodeList.querySelector('summary').textContent = `Afficher les ${episodes.length} épisodes disponibles`;
        renderAniListEpisodeList(episodes);
    } else {
        episodeList.hidden = true;
        episodeList.querySelector('ol').replaceChildren();
    }
}

function startAnimeStreamRequest(details) {
    const requestId = ++animeStreamRequestId;
    animeStreamEpisodes = [];
    animePlayerEpisodes = [];
    animeStreamRequestError = '';
    if (details.format === 'MOVIE') {
        animeStreamRequestStatus = 'ready';
        updateAniListEpisodeList([], 'Cette fiche AniList est un film : aucun épisode n’est à charger.');
        return;
    }
    animeStreamRequestStatus = 'loading';
    const request = fetchAnimeStreamEpisodes(details);
    animeStreamRequestPromise = request;
    request.then(episodes => {
        if (requestId !== animeStreamRequestId) return;
        animeStreamEpisodes = episodes;
        animePlayerEpisodes = episodes;
        animeStreamRequestStatus = 'ready';
        updateAnimePlayerEpisodeNavigation();
        if (episodes.length) {
            updateAniListEpisodeList(episodes, `${episodes.length} épisode${episodes.length > 1 ? 's' : ''} disponible${episodes.length > 1 ? 's' : ''} depuis ton serveur.`);
        } else {
            updateAniListEpisodeList([], 'Aucun lien vidéo n’a été renvoyé par le serveur pour cette saison.');
        }
    }).catch(error => {
        if (requestId !== animeStreamRequestId) return;
        console.error('Impossible de récupérer les épisodes depuis le serveur :', error);
        animeStreamRequestStatus = 'error';
        animeStreamRequestError = error instanceof TypeError
            ? 'Le navigateur n’a pas pu joindre l’API. Vérifie le CORS pour ton domaine GitHub Pages, le certificat HTTPS et la connexion réseau.'
            : error.message || 'Erreur inconnue pendant la récupération des épisodes.';
        updateAniListEpisodeList([], `Impossible de charger les épisodes : ${animeStreamRequestError}`);
        showAppToast('Impossible de charger les épisodes depuis ton serveur.', 'error');
    });
}

function renderAniListDetails(details) {
    const content = document.getElementById('animeDetailsContent');
    const message = document.getElementById('animeDetailsMessage');
    const image = document.getElementById('animeDetailsCover');
    const title = details.title?.english || details.title?.romaji || details.title?.native || 'Titre inconnu';
    const cover = details.coverImage?.extraLarge || details.coverImage?.large || details.coverImage?.medium || '';
    const formatLabels = { TV: 'Série TV', TV_SHORT: 'Série courte', MOVIE: 'Film', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Spécial' };
    const statusLabels = { FINISHED: 'Terminée', RELEASING: 'En cours de diffusion', NOT_YET_RELEASED: 'À venir', CANCELLED: 'Annulée', HIATUS: 'En pause' };
    const releasedCount = getReleasedAniListEpisodeCount(details);
    const meta = document.getElementById('animeDetailsMeta');
    const episodeSummary = document.getElementById('animeDetailsEpisodeSummary');
    const episodeList = document.getElementById('animeDetailsEpisodeList');
    const synopsis = (details.description || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#39;|&quot;|&amp;|&lt;|&gt;/gi, entity => ({
            '&#39;': "'", '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>'
        }[entity.toLowerCase()] || entity));
    const year = details.startDate?.year || details.seasonYear;
    const status = statusLabels[details.status] || 'Statut inconnu';

    document.getElementById('animeDetailsTitle').textContent = title;
    document.getElementById('animeDetailsFormat').textContent = formatLabels[details.format] || 'Anime';
    document.getElementById('animeDetailsAltTitle').textContent =
        details.title?.native && details.title.native !== title ? details.title.native : (details.title?.romaji !== title ? details.title?.romaji || '' : '');
    document.getElementById('animeDetailsSynopsis').textContent = synopsis.trim() || 'Aucun synopsis fourni sur AniList.';
    document.getElementById('animeDetailsAniListLink').href = details.siteUrl || `https://anilist.co/anime/${details.id}`;
    image.src = cover;
    image.alt = title;
    meta.replaceChildren();
    appendAniListDetailMeta(meta, 'Année', year);
    appendAniListDetailMeta(meta, 'Statut', status);
    appendAniListDetailMeta(meta, 'Total annoncé', details.episodes ? `${details.episodes} épisodes` : '');
    appendAniListDetailMeta(meta, 'Studio', details.studios?.nodes?.map(studio => studio.name).filter(Boolean).join(', '));

    if (details.format === 'MOVIE') {
        episodeSummary.textContent = 'Ce titre est un film ; il ne possède pas de liste d’épisodes.';
        episodeList.hidden = true;
    } else if (releasedCount === null) {
        episodeSummary.textContent = 'Chargement des épisodes disponibles depuis ton serveur…';
        episodeList.hidden = true;
    } else {
        episodeSummary.textContent = 'Chargement des épisodes disponibles depuis ton serveur…';
        episodeList.hidden = releasedCount === 0;
        episodeList.open = false;
        episodeList.dataset.loaded = 'false';
        episodeList.querySelector('summary').textContent = `Épisodes disponibles`;
        episodeList.ontoggle = () => {
            if (episodeList.open && episodeList.dataset.loaded !== 'true') {
                const fallbackEpisodes = Array.from({ length: releasedCount }, (_, index) => ({ episode: index + 1 }));
                renderAniListEpisodeList(fallbackEpisodes);
                episodeList.dataset.loaded = 'true';
            }
        };
    }

    message.hidden = true;
    content.hidden = false;
    startAnimeStreamRequest(details);
}

async function openAniListDetails(animeId) {
    const id = Number(animeId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        showAppToast('Cet anime ne possède pas d’identifiant AniList valide.', 'error');
        return;
    }

    const activeView = document.querySelector('.view-panel.active');
    animeDetailsReturnView = activeView?.id && activeView.id !== 'animeDetailsView' ? activeView.id : 'gridAnime';
    hideCardInfo();
    const content = document.getElementById('animeDetailsContent');
    const message = document.getElementById('animeDetailsMessage');
    if (!content || !message) return;
    ++animeStreamRequestId;
    content.hidden = true;
    message.textContent = 'Chargement des informations AniList…';
    message.hidden = false;
    showView('animeDetailsView');

    try {
        const details = await getKurolisteAniListDetails(id);
        if (document.getElementById('animeDetailsView')?.classList.contains('active')) {
            renderAniListDetails(details);
        }
    } catch (error) {
        console.error(`Impossible de charger la fiche AniList de l’anime ${id} :`, error);
        message.textContent = 'Impossible de charger cette fiche pour le moment. Vérifie ta connexion et réessaie.';
        showAppToast('Impossible de charger les informations AniList.', 'error');
    }
}

function closeAniListDetails() {
    showView(animeDetailsReturnView);
}

function openEditFromCardInfo() {
    const overlay = document.getElementById('cardInfoOverlay');
    if (!overlay || !overlay.dataset.cardId) return;
    hideCardInfo();
    editrow(Number(overlay.dataset.cardId));
}

function closeEditModal() {
    const modal = document.getElementById('animeForm-edit');
    if (!modal) return;
    modal.classList.remove('show');
    clearModal2();
}

function StatutChange(newval, prefix = '') {
    const currentValues = document.getElementById(`currentsvalues${prefix}`);
    const champEp = document.getElementById(`currentep${prefix}`);

    if (!currentValues) return;

    if (newval === 'watching' || newval === 'waiting' || newval === 'dropped') {
        currentValues.style.display = 'flex';
    } else {
        currentValues.style.display = 'none';
        if (champEp) champEp.value = null;
    }
}

function StatutChange2(newval) {
    StatutChange(newval, '-edit');
}

function sfChange(prefix = '') {
    const checkbox = document.getElementById(`checkboxsf${prefix}`);
    const divDuree = document.getElementById(`divduree${prefix}`);
    const divNbsaison = document.getElementById(`divnbsaison${prefix}`);
    const seasonCount = document.getElementById(`seasonCount${prefix}`);

    if (!checkbox || !divDuree || !divNbsaison) return;

    if (checkbox.checked) {
        divDuree.style.display = 'flex';
        divNbsaison.style.display = 'none';
        if (seasonCount) {
            seasonCount.value = '';
            updateSeasonInputs(0, [], prefix);
        }
    } else {
        divDuree.style.display = 'none';
        divNbsaison.style.display = 'flex';
    }
}

async function editBtnClick() {
    const rowid = document.getElementById('rowid').value;
    const urlimg = document.getElementById('imgURL-edit').value;
    const nomnative = document.getElementById('titrenatif-edit').value;
    const nomromaji = document.getElementById('titrermji-edit').value;
    const nomenglish = document.getElementById('titreen-edit').value;
    const languepref = document.getElementById('languepref-edit').value;
    const statut = document.getElementById('statut-edit').value;
    const saisonencours = 0;
    const epencours = Number(document.getElementById('currentep-edit').value) || 0;
    const checkboxsf = document.getElementById('checkboxsf-edit').checked;
    const duree = document.getElementById('duree-edit').value;
    const nbepisodes = Number(document.getElementById('seasonCount-edit').value) || 0;
    const champ_favori = document.getElementById('favorite-edit');
    const champ_flag = document.getElementById('flag-edit');

    let favori = champ_favori?.checked ? 1 : 0;
    let flag = champ_flag?.checked ? 1 : 0;
    const id = Number(rowid);
    const nbsaisons = 1;
    const detailsepsaison = null;

    const editButton = document.getElementById('editanime');
    if (editButton) {
        editButton.disabled = true;
        editButton.textContent = 'Modification...';
    }
    const updated = await updaterow(id, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepsaison, checkboxsf, duree, favori, flag);
    if (editButton) {
        editButton.disabled = false;
        editButton.textContent = 'Modifier';
    }
    if (!updated) return;
    closeEditModal();

    setTimeout(() => {
        const activeFilter = sessionStorage.getItem('currentListFilter') || currentFilterValue;
        currentFilterValue = activeFilter;
        selectList(parseFilter(activeFilter));
        clearModal2();
        sfChange('-edit');
    }, 500);
}

async function delBtnClick() {
    const rowid = document.getElementById('rowid').value;
    const nomromaji = document.getElementById('titrermji-edit').value;
    const nomenglish = document.getElementById('titreen-edit').value;
    const languepref = document.getElementById('languepref-edit').value;

    let nomanime = nomenglish;
    if (languepref === 'NA') {
        nomanime = nomromaji;
    }
    if (await showConfirmDialog(`Supprimer « ${nomanime} » de ta liste ?`, 'Supprimer cet anime')) {
        const deleted = await deleteRow(rowid);
        if (!deleted) return;
        closeEditModal();
        setTimeout(() => {
            const activeFilter = sessionStorage.getItem('currentListFilter') || currentFilterValue;
            currentFilterValue = activeFilter;
            selectList(parseFilter(activeFilter));
            clearModal2();
            sfChange('-edit');
        }, 500);
    }
}

function persistCurrentListFilter(filterValue) {
    currentFilterValue = filterValue || currentFilterValue;
    sessionStorage.setItem('currentListFilter', currentFilterValue);
}

function clearModal() {
    document.getElementById('titreSearch').value = '';
    document.getElementById('imgURL').value = '';
    document.getElementById('titrenatif').value = '';
    document.getElementById('titrermji').value = '';
    document.getElementById('titreen').value = '';
    document.getElementById('languepref').value = 'EN';
    document.getElementById('statut').value = 'toview';
    StatutChange('toview');
    document.getElementById('seasonCount').value = '';
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('checkboxsf').checked = false;
    document.getElementById('duree').value = '00:00';
    sfChange();
    getIfAnimeExist(0);
}

function clearModal2() {
    document.getElementById('imgURL-edit').value = '';
    document.getElementById('titrenatif-edit').value = '';
    document.getElementById('titrermji-edit').value = '';
    document.getElementById('titreen-edit').value = '';
    document.getElementById('languepref-edit').value = 'EN';
    document.getElementById('statut-edit').value = 'toview';
    StatutChange2('toview');
    document.getElementById('seasonCount-edit').value = '';
    document.getElementById('previewImg-edit').style.display = 'none';
    document.getElementById('checkboxsf-edit').checked = false;
    document.getElementById('duree-edit').value = '00:00';
    sfChange('-edit');
}

async function login (login, mdp) {
    const authenticated = await getUser(login, CryptoJS.SHA1(mdp).toString());
    if (authenticated) {
        window.location = "index.html?fromLogin";
    }
    return authenticated;
}

function setsess({ nomsess, valsess}){
    sessionStorage.setItem(nomsess, valsess);
    if (nomsess === "username") {
        if (localStorage.getItem('kuroniRememberLogin') === 'true') {
            localStorage.setItem(nomsess, valsess);
        } else {
            localStorage.removeItem(nomsess);
        }
    }
}

async function getrowinfos(id) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .select('*')
        .eq('id', id)
    if (error) console.error(error);
    let data_ = data[0];

    changerowvalues({
        id: data_.id,
        idanime: data_.idanime,
        urlimg: data_.urlimg,
        nomnative: data_.nomnative,
        nomromaji: data_.nomromaji,
        nomenglish: data_.nomenglish,
        languepref: data_.languepref,
        statut: data_.statut,
        nbsaisons: data_.nbsaisons,
        nbepisodes: data_.nbepisodes,
        saisonencours: data_.saisonencours,
        epencours: data_.epencours,
        detailsepparsaison: data_.detailsepparsaison,
        film: data_.film,
        duree: data_.duree,
        favori: data_.favori,
        flag: data_.flag
       });
}

function editrow(id) {
    document.getElementById('animeForm-edit').classList.add("show");
    getrowinfos(id);
}

function changerowvalues({id, idanime, urlimg, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepparsaison, film, duree, favori, flag}){
    const rowid = document.getElementById('rowid');
    const champ_imgurl = document.getElementById('imgURL-edit');
    const champ_urlimg = document.getElementById('previewImg-edit');
    const champ_nomnative = document.getElementById('titrenatif-edit');
    const champ_nomromaji = document.getElementById('titrermji-edit');
    const champ_nomenglish = document.getElementById('titreen-edit');
    const champ_languepref = document.getElementById('languepref-edit');
    const champ_statut = document.getElementById('statut-edit');
    const champ_nbsaisons = document.getElementById('seasonCount-edit');
    const div_nbsaisons = document.getElementById('divnbsaison-edit');
    const champ_epencours = document.getElementById('currentep-edit');
    const champ_film = document.getElementById('checkboxsf-edit');
    const champ_duree = document.getElementById('duree-edit');
    const div_duree = document.getElementById('divduree-edit');
    const divcurrentsvalues = document.getElementById('currentsvalues-edit');
    const champ_favori = document.getElementById('favorite-edit');
    const champ_flag = document.getElementById('flag-edit');

    if (favori == 1) {
        champ_favori.checked = true;
    }
    else {
        champ_favori.checked = false;
    }

    if (flag == 1) {
        champ_flag.checked = true;
    }
    else {
        champ_flag.checked = false;
    }

    rowid.value = id;

    champ_urlimg.src = urlimg;
    if (urlimg == ""){
        champ_urlimg.style.display = 'none';
    }
    else{
        champ_urlimg.style.display = 'block';
    }
    champ_nomnative.value = nomnative;
    champ_nomromaji.value = nomromaji;
    champ_nomenglish.value = nomenglish;
    champ_languepref.value = languepref;

    champ_statut.value = statut;
    if (statut == "watching" || statut == "waiting" || statut == "dropped") {
        divcurrentsvalues.style.display = 'block';
        champ_epencours.value = epencours || 0;
    } else {
        divcurrentsvalues.style.display = 'none';
        champ_epencours.value = 0;
    }

    champ_film.checked = film;
    if (film === 1) {
        div_nbsaisons.style.display = 'none';
        div_duree.style.display = 'flex';
        champ_duree.value = duree || '00:00';
    } else {
        div_nbsaisons.style.display = 'flex';
        div_duree.style.display = 'none';
        champ_nbsaisons.value = nbepisodes || 0;
    }
}

async function updaterow(id, nomnative, nomromaji, nomenglish, languepref, statut, nbsaisons, nbepisodes, saisonencours, epencours, detailsepparsaison, film, duree, favori, flag) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    let nompref = "";
    if (languepref == 'EN') {
        nompref = nomenglish;
    } else {
        nompref = nomromaji;
    }
    console.log(nompref);
    let film_ = 0;
    if (film == true) {
        film_ = 1;
    }
    if (nbsaisons == "") {
        nbsaisons = 1;
    }
    if (detailsepparsaison === "") {
        detailsepparsaison = null;
    }
    if (film_ === 1) {
        duree = duree || '00:00:00';
    } else {
        duree = '00:00:00';
    }
    const { data, error } = await Supabase
        .from(tablename)  
        .update({
            nomnative: nomnative, 
            nomromaji: nomromaji, 
            nomenglish: nomenglish, 
            languepref: languepref, 
            nompref: nompref,
            statut: statut, 
            nbsaisons: 1,
            nbepisodes: nbepisodes, 
            saisonencours: saisonencours, 
            epencours: epencours, 
            detailsepparsaison: null,
            film: film_, 
            duree: duree,
            favori: favori,
            flag: flag
        })
        .eq('id', id)
    if (error) {
        console.error(error);
        showAppToast('Impossible de modifier cet anime.', 'error');
        return false;
    }
    printCounts();
    showAppToast('Anime modifié.', 'success');
    return true;
}

function addLetterInTab(letter) {
    const table = document.querySelector("tbody"); // ton tableau doit avoir id="animeTable"
    // Création de la ligne
    const tr = document.createElement("tr");
    tr.classList.add('letter-separator');

    const tdLetter = document.createElement('td')
    tdLetter.colSpan = "5";
    tdLetter.innerHTML = letter;

    tr.appendChild(tdLetter);

    table.appendChild(tr);
}

async function getcountrows() {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { count, error } = await Supabase
        .from(tablename)  
        .select('*', {count:'exact',head:true});
    if (error) {
        console.error(error);
        showAppToast('Impossible de récupérer le résumé de la liste.', 'error');
        return;
    }
    
    sessionStorage.removeItem('nbrows');
    setsess({
        nomsess: "nbrows",
        valsess: count
    });
}

async function getcountrowsfinished() {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { count, error } = await Supabase
        .from(tablename)  
        .select('*', {count:'exact', head:true})
        .eq('statut', 'finished');
    if (error) console.error(error);
}

async function loadSettingsSummary() {
    const summary = document.getElementById('settingsWatchedCount');
    const username = sessionStorage.getItem('username');
    if (!summary || !username) return;

    summary.textContent = '- / -';
    const tablename = 'list' + username.toLowerCase();
    const [totalResult, finishedResult, watchingResult, droppedResult] = await Promise.all([
        Supabase.from(tablename).select('*', { count: 'exact', head: true }),
        Supabase.from(tablename).select('*', { count: 'exact', head: true }).eq('statut', 'finished'),
        Supabase.from(tablename).select('*', { count: 'exact', head: true }).eq('statut', 'watching'),
        Supabase.from(tablename).select('*', { count: 'exact', head: true }).eq('statut', 'dropped')
    ]);

    if ([totalResult, finishedResult, watchingResult, droppedResult].some(result => result.error)) {
        [totalResult, finishedResult, watchingResult, droppedResult].forEach(result => {
            if (result.error) console.error(result.error);
        });
        summary.textContent = '- / -';
        return;
    }

    summary.textContent = `${finishedResult.count || 0} / ${totalResult.count || 0}`;
    document.getElementById('settingsTotalCount').textContent = totalResult.count || 0;
    document.getElementById('settingsWatchingCount').textContent = watchingResult.count || 0;
    document.getElementById('settingsFinishedCount').textContent = finishedResult.count || 0;
    document.getElementById('settingsDroppedCount').textContent = droppedResult.count || 0;
}

async function exportKurolisteText() {
    const username = sessionStorage.getItem('username');
    if (!username) {
        showAppToast('Impossible de déterminer le compte de la Kuroliste.', 'error');
        return;
    }

    const tableName = 'list' + username.toLowerCase();
    const { data, error } = await Supabase
        .from(tableName)
        .select('statut, nompref, nomromaji, nomenglish')
        .in('statut', ['finished', 'watching', 'toview']);

    if (error) {
        console.error('Impossible d’exporter la Kuroliste :', error);
        showAppToast('Impossible de télécharger la Kuroliste.', 'error');
        return;
    }

    const sections = [
        { status: 'finished', title: 'VUS' },
        { status: 'watching', title: 'EN COURS' },
        { status: 'toview', title: 'À VOIR' }
    ];
    const lines = ['KUROLISTE'];

    sections.forEach(({ status, title }) => {
        const titles = (data || [])
            .filter(anime => anime.statut === status)
            .map(anime => anime.nompref || anime.nomromaji || anime.nomenglish)
            .filter(Boolean)
            .sort((first, second) => first.localeCompare(second, 'fr', { sensitivity: 'base' }));

        lines.push('', title, ...titles.map(animeTitle => `- ${animeTitle}`));
    });

    const file = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    const safeUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.href = downloadUrl;
    link.download = `kuroliste-${safeUsername || 'export'}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    showAppToast('La Kuroliste a été téléchargée.', 'success');
}

async function fetchAllKurolisteRows(tableName, columns = '*') {
    const rows = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await Supabase
            .from(tableName)
            .select(columns)
            .order('id', { ascending: true })
            .range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) return rows;
    }
}

function downloadKurolisteJson(entries, username) {
    const backup = {
        format: 'kuroliste',
        version: 1,
        exportedAt: new Date().toISOString(),
        entries
    };
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    const safeUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.href = downloadUrl;
    link.download = `kuroliste-${safeUsername || 'export'}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

async function exportKurolisteJson() {
    const username = sessionStorage.getItem('username');
    if (!username) {
        showAppToast('Impossible de déterminer le compte de la Kuroliste.', 'error');
        return;
    }

    try {
        const entries = await fetchAllKurolisteRows(`list${username.toLowerCase()}`);
        downloadKurolisteJson(entries, username);
        showAppToast(`${entries.length} anime exporté${entries.length === 1 ? '' : 's'} en sauvegarde JSON.`, 'success');
    } catch (error) {
        console.error('Impossible de créer la sauvegarde JSON de la Kuroliste :', error);
        showAppToast('Impossible de télécharger la sauvegarde de la Kuroliste.', 'error');
    }
}

const KUROLISTE_STATUSES = new Set(['toview', 'next', 'watching', 'finished', 'waiting', 'dropped', 'restart', 'again']);
const KUROLISTE_IMPORT_FIELDS = [
    'idanime', 'urlimg', 'nomnative', 'nomromaji', 'nomenglish', 'languepref', 'nompref',
    'statut', 'nbsaisons', 'nbepisodes', 'saisonencours', 'epencours', 'detailsepparsaison',
    'film', 'duree', 'favori', 'flag', 'caption'
];

function normalizeKurolisteImportEntry(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new TypeError('Une entrée de la sauvegarde n’est pas valide.');
    }
    if (typeof entry.nompref !== 'string' || !entry.nompref.trim()) {
        throw new TypeError('Une entrée de la sauvegarde n’a pas de titre valide.');
    }
    if (!KUROLISTE_STATUSES.has(entry.statut)) {
        throw new TypeError(`Statut invalide pour « ${entry.nompref} ».`);
    }

    const normalized = {};
    for (const field of KUROLISTE_IMPORT_FIELDS) {
        if (field === 'caption') {
            if (typeof entry[field] === 'string') normalized.caption = entry[field];
            continue;
        }
        if (['nomnative', 'nomromaji', 'nomenglish', 'languepref', 'nompref', 'urlimg', 'detailsepparsaison', 'duree'].includes(field)) {
            if (entry[field] !== null && entry[field] !== undefined && typeof entry[field] !== 'string') {
                throw new TypeError(`La valeur « ${field} » de « ${entry.nompref} » n’est pas valide.`);
            }
            if (entry[field] !== undefined) normalized[field] = entry[field];
            continue;
        }
        if (['idanime', 'nbsaisons', 'nbepisodes', 'saisonencours', 'epencours', 'film', 'favori', 'flag'].includes(field)) {
            const value = entry[field];
            if (value === undefined) continue;
            if (value === null || value === '') {
                normalized[field] = null;
                continue;
            }
            const number = Number(value);
            if (!Number.isSafeInteger(number) || number < 0) {
                throw new TypeError(`La valeur « ${field} » de « ${entry.nompref} » n’est pas valide.`);
            }
            normalized[field] = number;
        }
    }
    normalized.nompref = entry.nompref.trim();
    normalized.statut = entry.statut;
    return normalized;
}

function getKurolisteEntryKeys(entry) {
    const animeId = Number(entry.idanime);
    const keys = [`title:${entry.nompref.trim().toLocaleLowerCase('fr-FR')}`];
    if (Number.isSafeInteger(animeId) && animeId > 0) keys.push(`anilist:${animeId}`);
    return keys;
}

async function importKurolisteJson(file) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
        showAppToast('Le fichier de sauvegarde dépasse la limite de 20 Mo.', 'error');
        return;
    }

    const username = sessionStorage.getItem('username');
    if (!username) {
        showAppToast('Impossible de déterminer le compte de la Kuroliste.', 'error');
        return;
    }

    let insertedCount = 0;
    try {
        const backup = JSON.parse(await file.text());
        if (backup?.format !== 'kuroliste' || backup.version !== 1 || !Array.isArray(backup.entries)) {
            throw new TypeError('Ce fichier n’est pas une sauvegarde Kuroliste reconnue.');
        }
        if (backup.entries.length > 10000) {
            throw new RangeError('La sauvegarde contient trop d’entrées.');
        }
        const importedEntries = backup.entries.map(normalizeKurolisteImportEntry);
        const tableName = `list${username.toLowerCase()}`;
        const currentEntries = await fetchAllKurolisteRows(tableName, 'idanime, nompref');
        const existingKeys = new Set(currentEntries.flatMap(getKurolisteEntryKeys));
        const newEntries = importedEntries.filter(entry => {
            const keys = getKurolisteEntryKeys(entry);
            if (keys.some(key => existingKeys.has(key))) return false;
            keys.forEach(key => existingKeys.add(key));
            return true;
        });

        for (let offset = 0; offset < newEntries.length; offset += 100) {
            const batch = newEntries.slice(offset, offset + 100);
            let { error } = await Supabase.from(tableName).insert(batch);
            if (error && (error.code === '42703' || error.code === 'PGRST204') && batch.some(entry => 'caption' in entry)) {
                const withoutCaption = batch.map(({ caption, ...entry }) => entry);
                ({ error } = await Supabase.from(tableName).insert(withoutCaption));
            }
            if (error) throw error;
            insertedCount += batch.length;
        }

        if (insertedCount) {
            await showView('gridAnime');
            await selectList(parseFilter(sessionStorage.getItem('currentListFilter') || 'toview,next,waiting,dropped,restart,again'));
            loadSettingsSummary();
        }
        showAppToast(`${insertedCount} anime restauré${insertedCount === 1 ? '' : 's'} · ${importedEntries.length - insertedCount} doublon${importedEntries.length - insertedCount === 1 ? '' : 's'} ignoré${importedEntries.length - insertedCount === 1 ? '' : 's'}.`, 'success');
    } catch (error) {
        console.error('Impossible de restaurer la Kuroliste :', error);
        const message = insertedCount
            ? `Import interrompu après ${insertedCount} anime. Vérifie la liste avant de relancer l’import.`
            : 'Restauration impossible : fichier invalide ou erreur de base de données.';
        showAppToast(message, 'error');
    }
}

async function getcountrowswatching() {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { count, error } = await Supabase
        .from(tablename)  
        .select('*', {count:'exact',head:true})
        .eq('statut', 'watching');
    if (error) console.error(error);
}

function printCounts() {
    getcountrows();
    getcountrowswatching();
    getcountrowsfinished();
}

async function deleteRow(id) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .delete()
        .eq('id', id);
    if (error) {
        console.error(error);
        showAppToast('Impossible de supprimer cet anime.', 'error');
        return false;
    }
    showAppToast('Anime supprimé.', 'success');
    return true;
}

async function nextep(id) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .select('nbsaisons, nbepisodes, saisonencours, epencours, detailsepparsaison')
        .eq('id', id);
    if (error) console.error(error);
    let datas = data[0];

    let currentep = datas.epencours;
    let currentsaison = datas.saisonencours;
    let details = datas.detailsepparsaison.split(',');
    let newstatus = 'watching';

    currentep += 1;
    if (datas.detailsepparsaison != null) {
        if (currentep > details[currentsaison-1] && currentsaison < details.length) {
            currentep = 1;
            currentsaison += 1;
        }
        if (currentep > details[currentsaison-1] && currentsaison == details.length) {
            currentep -= 1;
            newstatus = 'finished';
        }
    }

    updateEp(id, currentep, currentsaison, newstatus);
}

async function updateEp(id, ep, saison, status) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .update({
            statut: status, 
            saisonencours: saison, 
            epencours: ep
        })
        .eq('id', id)
    if (error) {
        console.error(error);
        showAppToast('Impossible de mettre à jour la progression.', 'error');
        return false;
    }
    printCounts();
    const activeFilter = sessionStorage.getItem('currentListFilter') || currentFilterValue;
    currentFilterValue = activeFilter;
    selectList(parseFilter(activeFilter));
    showAppToast('Progression mise à jour.', 'success');
    return true;
}

async function markAnimeFinished(id) {
    const tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { error } = await Supabase
        .from(tablename)
        .update({ statut: 'finished' })
        .eq('id', id);
    if (error) {
        console.error(error);
        showAppToast('Impossible de terminer cet anime.', 'error');
        return false;
    }
    printCounts();
    const activeFilter = sessionStorage.getItem('currentListFilter') || currentFilterValue;
    currentFilterValue = activeFilter;
    selectList(parseFilter(activeFilter));
    showAppToast('Anime marqué comme terminé.', 'success');
    return true;
}

async function getIfAnimeExist(idanime) {
    let tablename = 'list' + sessionStorage.getItem('username').toLowerCase();
    const { data, error } = await Supabase
        .from(tablename)  
        .select('id')
        .eq('idanime', idanime);
    if (error) console.error(error);
    if (data[0] != undefined) {
        document.getElementById('warninginlist').style.display = 'block';
    }
    else{
        document.getElementById('warninginlist').style.display = 'none';
    }
}

// Search view helpers
function clearSearchResults(message = 'Commencez une recherche pour afficher les résultats.') {
    const results = document.getElementById('searchResults');
    const empty = document.getElementById('searchEmpty');
    if (!results || !empty) return;
    results.innerHTML = '';
    empty.textContent = message;
    empty.style.display = 'block';
}

let selectedSearchAnime = null;
let searchRequestId = 0;

function showSearchError(query) {
    const empty = document.getElementById('searchEmpty');
    if (!empty) return;
    empty.replaceChildren();
    const message = document.createElement('span');
    message.textContent = 'La recherche est momentanément indisponible.';
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'search-retry-button';
    retryButton.textContent = 'Réessayer';
    retryButton.addEventListener('click', () => searchAnime(query));
    empty.append(message, retryButton);
    empty.style.display = 'grid';
}

function renderSearchResults(items) {
    const results = document.getElementById('searchResults');
    const empty = document.getElementById('searchEmpty');
    const details = document.getElementById('searchDetails');
    if (!results || !empty) return;
    results.innerHTML = '';
    if (details) {
        details.classList.add('hidden');
    }
    if (!items.length) {
        empty.textContent = 'Aucun résultat trouvé.';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    items.forEach(item => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'search-result-item';
        const metaValue = item.type === 'Film'
            ? (item.duration ? `${item.duration} min` : 'Durée inconnue')
            : (item.nbepisodes ? `${item.nbepisodes} épisodes` : 'Épisodes inconnus');

        row.innerHTML = `
            <div class="search-result-art">
                <img src="${item.coverImage || 'https://via.placeholder.com/120x168?text=No+Image'}" alt="${item.title}" loading="lazy">
            </div>
            <div class="search-result-content">
                <span class="search-result-title">${item.title || 'Titre inconnu'}</span>
                <span class="search-result-subtitle">${item.type || 'Série'} • ${metaValue}</span>
                <span class="search-result-year">${item.year ? `${item.year}` : 'Année inconnue'}</span>
            </div>
        `;
        if (item.description) {
            const description = document.createElement('span');
            description.className = 'search-result-description';
            description.textContent = item.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            row.querySelector('.search-result-content').appendChild(description);
        }
        row.addEventListener('click', () => showCardInfo({
            id: item.id,
            img: item.coverImage || '',
            title: item.title,
            saisons: 1,
            episodes: item.nbepisodes,
            status: 'toview',
            saisonencours: 0,
            epencours: 0,
            film: item.type === 'Film' ? 1 : 0,
            duree: item.duration || '',
            favori: 0,
            flag: 0
        }, { isSearchResult: true, searchData: item }));
        results.appendChild(row);
    });
}

function selectSearchResult(item) {
    selectedSearchAnime = item;
    const details = document.getElementById('searchDetails');
    const image = document.getElementById('searchDetailsImage');
    const title = document.getElementById('searchDetailsTitle');
    const subtitle = document.getElementById('searchDetailsSubtitle');
    const episodes = document.getElementById('searchDetailsEpisodes');
    const year = document.getElementById('searchDetailsYear');
    const addButton = document.getElementById('searchAddButton');

    if (!details || !image || !title || !subtitle || !episodes || !year || !addButton) return;

    image.src = item.coverImage || 'https://via.placeholder.com/240x360?text=No+Image';
    title.textContent = item.title || 'Titre inconnu';
    subtitle.textContent = item.subtitle || '';
    episodes.textContent = item.nbepisodes ? `${item.nbepisodes} épisodes` : 'Épisodes inconnus';
    year.textContent = item.year ? `Année ${item.year}` : '';
    details.classList.remove('hidden');

    addButton.disabled = false;
    addButton.textContent = 'Ajouter à la liste';
    addButton.onclick = async () => {
        addButton.disabled = true;
        addButton.textContent = 'Ajout...';
        const nbepisodes = Number(item.nbepisodes) || 0;
        const isMovie = item.type === 'Film';
        const dureeVal = isMovie ? formatDurationFromMinutes(item.duration) : '00:00:00';
        const added = await addAnime(
            item.id,
            item.coverImage || '',
            item.nativeTitle || '',
            item.romajiTitle || item.title || '',
            item.englishTitle || item.title || '',
            'EN',
            'toview',
            1,
            nbepisodes,
            0,
            0,
            '',
            isMovie,
            dureeVal,
            0,
            0,
            item.description || ''
        );
        addButton.textContent = added ? 'Ajouté' : 'Réessayer';
        addButton.disabled = false;
    };
}

async function searchAnime(query) {
    const requestId = ++searchRequestId;
    if (!query) {
        clearSearchResults();
        return;
    }

    const gql = `query ($search: String) {
        Page(perPage: 12) {
            media(search: $search, type: ANIME) {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    extraLarge
                    medium
                    large
                }
                format
                seasonYear
                episodes
                duration
                description
                isAdult
                genres
            }
        }
    }`;

    const variables = { search: query };
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query: gql, variables })
        });
        const data = await response.json();
        if (requestId !== searchRequestId) return;
        if (!response.ok || data?.errors?.length) {
            throw new Error(data?.errors?.map(error => error.message).join('; ') || `HTTP ${response.status}`);
        }
        const media = data?.data?.Page?.media || [];
        const hideHentai = localStorage.getItem('kuroniHideHentaiSearch') !== 'false';
        const items = media.filter(anime => !hideHentai ||
            (!anime.isAdult && !anime.genres?.some(genre => genre.toLowerCase() === 'hentai')))
            .map(anime => {
            const isMovie = anime.format === 'MOVIE';
            const type = isMovie ? 'Film' : 'Série';
            return {
                id: anime.id,
                title: anime.title.english || anime.title.romaji || anime.title.native || 'Sans titre',
                nativeTitle: anime.title.native || '',
                romajiTitle: anime.title.romaji || anime.title.english || anime.title.native || '',
                englishTitle: anime.title.english || anime.title.romaji || anime.title.native || '',
                subtitle: isMovie
                    ? (anime.duration ? `${anime.duration} min` : 'Durée inconnue')
                    : `${anime.episodes || '?'} Ep`,
                type,
                coverImage: anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium || '',
                nbepisodes: anime.episodes || 0,
                duration: anime.duration || 0,
                year: anime.seasonYear || '',
                description: anime.description || ''
            };
        });
        renderSearchResults(items);
    } catch (err) {
        if (requestId !== searchRequestId) return;
        console.error('Erreur recherche AniList :', err);
        showSearchError(query);
    } finally {
        window.clearTimeout(timeoutId);
    }

}

async function submitPasswordChange(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.getElementById('changePasswordStatus');
    const submitButton = form.querySelector('button[type="submit"]');
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const setStatus = (message, isError = false) => {
        status.textContent = message;
        status.classList.toggle('error', isError);
    };

    if (newPassword !== confirmPassword) {
        setStatus('Les nouveaux mots de passe ne correspondent pas.', true);
        return;
    }
    if (currentPassword === newPassword) {
        setStatus('Le nouveau mot de passe doit être différent de l’ancien.', true);
        return;
    }

    submitButton.disabled = true;
    submitButton.querySelector('span:last-child').textContent = 'Modification...';
    setStatus('');
    try {
        let accountLogin = sessionStorage.getItem('accountLogin');
        if (!accountLogin) {
            const { data, error } = await Supabase
                .from('users')
                .select('login')
                .eq('name', sessionStorage.getItem('username'))
                .limit(1);
            if (error) throw error;
            accountLogin = data?.[0]?.login;
        }
        if (!accountLogin) {
            throw new Error('Impossible de retrouver le compte connecté.');
        }

        const oldHash = CryptoJS.SHA1(currentPassword).toString();
        const newHash = CryptoJS.SHA1(newPassword).toString();
        const { data, error } = await Supabase
            .from('users')
            .update({ mdp: newHash })
            .eq('login', accountLogin)
            .eq('mdp', oldHash)
            .select('login');
        if (error) throw error;
        if (!data?.length) {
            setStatus('Mot de passe actuel incorrect.', true);
            return;
        }

        form.reset();
        setStatus('Mot de passe modifié avec succès.');
    } catch (error) {
        console.error('Impossible de modifier le mot de passe :', error);
        setStatus('La modification du mot de passe a échoué. Réessaie plus tard.', true);
    } finally {
        submitButton.disabled = false;
        submitButton.querySelector('span:last-child').textContent = 'Modifier le mot de passe';
    }
}

const KUROCAL_FAVORITES_KEY = 'kurocalFavorites';
const KUROCAL_HIDE_HENTAI_KEY = 'kurocalHideHentai';
const KUROCAL_SCHEDULE_QUERY = `query ($page: Int!, $from: Int!, $to: Int!) {
    Page(page: $page, perPage: 50) {
        pageInfo {
            hasNextPage
        }
        airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
            airingAt
            episode
            media {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    extraLarge
                    large
                    medium
                }
                format
                episodes
                duration
                seasonYear
                genres
                isAdult
                trailer {
                    id
                    site
                }
                description
            }
        }
    }
}`;
const KUROCAL_NEW_RELEASES_QUERY = `query ($after: FuzzyDateInt!) {
    Page(page: 1, perPage: 50) {
        media(type: ANIME, status: NOT_YET_RELEASED, startDate_greater: $after, sort: START_DATE) {
            id
            title {
                romaji
                english
                native
            }
            coverImage {
                extraLarge
                large
                medium
            }
            format
            episodes
            duration
            seasonYear
            startDate {
                year
                month
                day
            }
            genres
            isAdult
            trailer {
                id
                site
            }
            description
        }
    }
}`;
const KUROCAL_FAVORITE_SCHEDULE_QUERY = `query ($ids: [Int]!) {
    Page(page: 1, perPage: 50) {
        media(id_in: $ids, type: ANIME) {
            id
            episodes
            genres
            isAdult
            airingSchedule(notYetAired: true, page: 1, perPage: 50) {
                nodes {
                    airingAt
                    episode
                }
            }
        }
    }
}`;

let kurocalWeekStart = getKurocalWeekStart(new Date());
let kurocalSelectedDate = new Date();
let kurocalScheduleCache = new Map();
let kurocalScheduleItems = [];
let kurocalScheduleRequestId = 0;
let kurocalOverviewItems = null;
let kurocalOverviewRequestId = 0;
let kurocalNewReleaseItems = null;
let kurocalNewReleaseRequestId = 0;
let kurocalFavoriteScheduleItems = null;
let kurocalFavoriteScheduleRequestId = 0;
let kurocalReturnView = 'gridAnime';
let kurocalCurrentMedia = null;
let kurocalCurrentAiring = null;
let kurocalFavoriteOnly = false;
let kurocalSlideDirection = '';
let kurocalScheduleDisplayMode = 'date';
let kurocalCountdownInterval = null;
let kurocalFavoritesCountdownInterval = null;
let kurocalTranslationRequestId = 0;
let kurocalSynopsisTranslationCache = new Map();
let kurocalSynopsisOriginal = '';
let kurocalSynopsisTranslated = false;

function getKurocalFavoritesStorageKey() {
    const username = sessionStorage.getItem('username') || 'default';
    return `${KUROCAL_FAVORITES_KEY}:${username.toLowerCase()}`;
}

function getKurocalSettingStorageKey(setting) {
    const username = sessionStorage.getItem('username') || 'default';
    return `${setting}:${username.toLowerCase()}`;
}

function shouldHideKurocalHentai() {
    return localStorage.getItem(getKurocalSettingStorageKey(KUROCAL_HIDE_HENTAI_KEY)) !== 'false';
}

function isKurocalHentai(media) {
    return media?.isAdult === true || media?.genres?.some(genre => genre.toLowerCase() === 'hentai') === true;
}

function setKurocalHentaiFilter(enabled) {
    const checkbox = document.getElementById('kurocalHideHentai');
    try {
        localStorage.setItem(getKurocalSettingStorageKey(KUROCAL_HIDE_HENTAI_KEY), String(enabled));
    } catch (error) {
        console.error('Impossible d’enregistrer le filtre hentai Kurocal :', error);
        if (checkbox) checkbox.checked = !enabled;
        showAppToast('Impossible d’enregistrer ce réglage sur cet appareil.', 'error');
        return;
    }

    if (checkbox) checkbox.checked = enabled;
    renderKurocalSchedule();
    renderKurocalNewReleases();
    if (document.getElementById('kurocalOverviewPanel')?.hidden === false) renderKurocalOverview();
    if (document.getElementById('kurocalFavoritesPanel')?.hidden === false) {
        renderKurocalFavorites();
    }
    showAppToast(enabled ? 'Les anime hentai sont masqués.' : 'Le filtre hentai est désactivé.', 'success');
}

function getKurocalWeekStart(date) {
    const weekStart = new Date(date);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    return weekStart;
}

function addKurocalDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
}

function getKurocalDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getKurocalTitle(media) {
    return media?.title?.english || media?.title?.romaji || media?.title?.native || 'Titre inconnu';
}

function getKurocalCover(media) {
    return media?.coverImage?.extraLarge || media?.coverImage?.large || media?.coverImage?.medium || '';
}

function formatKurocalDate(date, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

async function requestAniList(query, variables = {}) {
    const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables })
    });
    const result = await response.json();
    if (!response.ok || result.errors?.length) {
        const reason = result.errors?.map(error => error.message).join('; ') || `HTTP ${response.status}`;
        throw new Error(`AniList: ${reason}`);
    }
    return result.data;
}

function getKurocalFavorites() {
    try {
        const saved = JSON.parse(localStorage.getItem(getKurocalFavoritesStorageKey()) || '[]');
        if (!Array.isArray(saved)) throw new TypeError('Les favoris Kurocal ne sont pas une liste valide.');
        return saved.filter(media => media && media.id != null);
    } catch (error) {
        console.error('Impossible de lire les favoris Kurocal :', error);
        showAppToast('Impossible de lire les favoris Kurocal enregistrés sur cet appareil.', 'error');
        return [];
    }
}

function isKurocalFavorite(mediaId) {
    return getKurocalFavorites().some(media => String(media.id) === String(mediaId));
}

function exportKurocalFavorites() {
    const favorites = getKurocalFavorites();
    const backup = {
        format: 'kurocal-favorites',
        version: 1,
        exportedAt: new Date().toISOString(),
        favorites
    };
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    const username = (sessionStorage.getItem('username') || 'export').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.href = downloadUrl;
    link.download = `kurocal-favoris-${username || 'export'}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    showAppToast(`${favorites.length} favori${favorites.length === 1 ? '' : 's'} Kurocal exporté${favorites.length === 1 ? '' : 's'}.`, 'success');
}

function normalizeImportedKurocalFavorite(media) {
    if (!media || typeof media !== 'object' || !Number.isInteger(Number(media.id)) || Number(media.id) <= 0) {
        throw new TypeError('Un favori ne contient pas d’identifiant AniList valide.');
    }
    if (!media.title || typeof media.title !== 'object') {
        throw new TypeError('Un favori ne contient pas de titre valide.');
    }

    const stringOrEmpty = value => typeof value === 'string' ? value : '';
    const finiteNumberOrNull = value => Number.isFinite(Number(value)) && value !== null && value !== '' ? Number(value) : null;
    const datePart = value => {
        const number = finiteNumberOrNull(value);
        return number !== null && Number.isInteger(number) ? number : null;
    };
    const cover = media.coverImage && typeof media.coverImage === 'object' ? media.coverImage : {};
    const trailer = media.trailer && typeof media.trailer === 'object' ? media.trailer : null;
    const startDate = media.startDate && typeof media.startDate === 'object' ? media.startDate : {};

    return {
        id: Number(media.id),
        title: {
            english: stringOrEmpty(media.title.english),
            romaji: stringOrEmpty(media.title.romaji),
            native: stringOrEmpty(media.title.native)
        },
        coverImage: {
            extraLarge: stringOrEmpty(cover.extraLarge),
            large: stringOrEmpty(cover.large),
            medium: stringOrEmpty(cover.medium)
        },
        format: stringOrEmpty(media.format),
        episodes: finiteNumberOrNull(media.episodes),
        duration: finiteNumberOrNull(media.duration),
        seasonYear: finiteNumberOrNull(media.seasonYear),
        startDate: {
            year: datePart(startDate.year),
            month: datePart(startDate.month),
            day: datePart(startDate.day)
        },
        genres: Array.isArray(media.genres) ? media.genres.filter(genre => typeof genre === 'string') : [],
        isAdult: media.isAdult === true,
        trailer: trailer ? {
            id: stringOrEmpty(trailer.id),
            site: stringOrEmpty(trailer.site)
        } : null,
        description: stringOrEmpty(media.description)
    };
}

async function importKurocalFavorites(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showAppToast('Le fichier de favoris dépasse la limite de 5 Mo.', 'error');
        return;
    }

    try {
        const backup = JSON.parse(await file.text());
        if (backup?.format !== 'kurocal-favorites' || backup.version !== 1 || !Array.isArray(backup.favorites)) {
            throw new TypeError('Ce fichier n’est pas un export Kurocal reconnu.');
        }

        const imported = backup.favorites.map(normalizeImportedKurocalFavorite);
        const current = getKurocalFavorites();
        const existingIds = new Set(current.map(media => String(media.id)));
        const additions = imported.filter(media => {
            const id = String(media.id);
            if (existingIds.has(id)) return false;
            existingIds.add(id);
            return true;
        });
        const merged = [...current, ...additions];
        localStorage.setItem(getKurocalFavoritesStorageKey(), JSON.stringify(merged));
        kurocalFavoriteScheduleRequestId++;
        kurocalFavoriteScheduleItems = null;
        renderKurocalSchedule();
        renderKurocalNewReleases();
        if (document.getElementById('kurocalOverviewPanel')?.hidden === false) renderKurocalOverview();
        if (document.getElementById('kurocalFavoritesPanel')?.hidden === false) renderKurocalFavorites();
        if (kurocalCurrentMedia) updateKurocalDetailFavoriteButton();
        showAppToast(`${additions.length} nouveau${additions.length === 1 ? '' : 'x'} favori${additions.length === 1 ? '' : 's'} importé${additions.length === 1 ? '' : 's'}.`, 'success');
    } catch (error) {
        console.error('Impossible d’importer les favoris Kurocal :', error);
        showAppToast('Import impossible : fichier invalide ou stockage indisponible.', 'error');
    }
}

function toggleKurocalFavorite(media) {
    const favorites = getKurocalFavorites();
    const isFavorite = favorites.some(item => String(item.id) === String(media.id));
    const updated = isFavorite
        ? favorites.filter(item => String(item.id) !== String(media.id))
        : [...favorites, media];
    try {
        localStorage.setItem(getKurocalFavoritesStorageKey(), JSON.stringify(updated));
    } catch (error) {
        console.error('Impossible d’enregistrer les favoris Kurocal :', error);
        showAppToast('Impossible d’enregistrer ce favori sur cet appareil.', 'error');
        return;
    }
    kurocalFavoriteScheduleRequestId++;
    kurocalFavoriteScheduleItems = null;
    renderKurocalSchedule();
    renderKurocalNewReleases();
    if (document.getElementById('kurocalOverviewPanel')?.hidden === false) renderKurocalOverview();
    if (document.getElementById('kurocalFavoritesPanel')?.hidden === false) renderKurocalFavorites();
    if (kurocalCurrentMedia && String(kurocalCurrentMedia.id) === String(media.id)) {
        updateKurocalDetailFavoriteButton();
    }
}

function makeKurocalCard(media, meta, airing = null) {
    const card = document.createElement('article');
    card.className = 'kurocal-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${getKurocalTitle(media)} — ${meta}`);
    card.addEventListener('click', () => openKurocalDetail(media, airing));
    card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openKurocalDetail(media, airing);
        }
    });

    const poster = document.createElement('div');
    poster.className = 'kurocal-card-poster';
    const image = document.createElement('img');
    image.src = getKurocalCover(media);
    image.alt = '';
    image.loading = 'lazy';
    poster.appendChild(image);

    const metaBadge = document.createElement('span');
    metaBadge.className = 'kurocal-card-meta';
    metaBadge.textContent = meta;
    poster.appendChild(metaBadge);

    const favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'kurocal-card-favorite';
    favoriteButton.classList.toggle('is-favorite', isKurocalFavorite(media.id));
    favoriteButton.setAttribute('aria-label', isKurocalFavorite(media.id) ? 'Retirer des favoris Kurocal' : 'Ajouter aux favoris Kurocal');
    favoriteButton.title = favoriteButton.getAttribute('aria-label');
    favoriteButton.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">star</span>';
    favoriteButton.addEventListener('click', event => {
        event.stopPropagation();
        toggleKurocalFavorite(media);
    });
    poster.appendChild(favoriteButton);
    card.appendChild(poster);

    const title = document.createElement('h3');
    title.textContent = getKurocalTitle(media);
    card.appendChild(title);
    return card;
}

function renderKurocalCardSkeletons(grid, count = 6) {
    grid.replaceChildren();
    grid.setAttribute('aria-busy', 'true');
    for (let index = 0; index < count; index++) {
        const card = document.createElement('div');
        card.className = 'kurocal-card kurocal-card-skeleton';
        card.setAttribute('aria-hidden', 'true');
        card.innerHTML = '<span class="kurocal-skeleton-poster"></span><span class="kurocal-skeleton-title"></span>';
        grid.appendChild(card);
    }
}

function renderKurocalOverviewNewReleases() {
    const grid = document.getElementById('kurocalOverviewNewGrid');
    const message = document.getElementById('kurocalOverviewNewMessage');
    if (!grid || !message) return;
    grid.replaceChildren();
    if (kurocalNewReleaseItems === null) {
        renderKurocalCardSkeletons(grid, 3);
        message.textContent = '';
        return;
    }

    const releases = kurocalNewReleaseItems
        .filter(media => hasKurocalFullStartDate(media.startDate))
        .filter(media => !shouldHideKurocalHentai() || !isKurocalHentai(media))
        .sort((first, second) => {
            const firstDate = new Date(first.startDate.year, first.startDate.month - 1, first.startDate.day);
            const secondDate = new Date(second.startDate.year, second.startDate.month - 1, second.startDate.day);
            return firstDate - secondDate;
        })
        .slice(0, 3);

    releases.forEach(media => {
        const date = new Date(media.startDate.year, media.startDate.month - 1, media.startDate.day);
        grid.appendChild(makeKurocalCard(media, formatKurocalDate(date, { day: 'numeric', month: 'short' })));
    });
    message.textContent = releases.length ? '' : 'Aucune nouveauté datée à afficher pour le moment.';
}

function renderKurocalOverview() {
    const todayGrid = document.getElementById('kurocalOverviewTodayGrid');
    const todayMessage = document.getElementById('kurocalOverviewTodayMessage');
    const upcomingGrid = document.getElementById('kurocalOverviewUpcomingGrid');
    const upcomingMessage = document.getElementById('kurocalOverviewUpcomingMessage');
    if (!todayGrid || !todayMessage || !upcomingGrid || !upcomingMessage) return;
    todayGrid.replaceChildren();
    upcomingGrid.replaceChildren();
    todayGrid.setAttribute('aria-busy', 'false');
    upcomingGrid.setAttribute('aria-busy', 'false');

    if (kurocalOverviewItems === null) {
        renderKurocalCardSkeletons(todayGrid, 3);
        renderKurocalCardSkeletons(upcomingGrid, 6);
        todayMessage.textContent = '';
        upcomingMessage.textContent = '';
        renderKurocalOverviewNewReleases();
        return;
    }

    const today = new Date();
    const todayKey = getKurocalDateKey(today);
    const upcomingLimit = addKurocalDays(today, 7);
    const items = kurocalOverviewItems
        .filter(item => item.media)
        .filter(item => !shouldHideKurocalHentai() || !isKurocalHentai(item.media))
        .filter(item => new Date(item.airingAt * 1000) >= today && new Date(item.airingAt * 1000) < upcomingLimit)
        .sort((first, second) => first.airingAt - second.airingAt);
    const todayItems = items.filter(item => getKurocalDateKey(new Date(item.airingAt * 1000)) === todayKey);
    const upcomingItems = items.filter(item => getKurocalDateKey(new Date(item.airingAt * 1000)) !== todayKey);

    todayItems.forEach(item => {
        const airingDate = new Date(item.airingAt * 1000);
        const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(airingDate);
        todayGrid.appendChild(makeKurocalCard(item.media, `${time} · Ép. ${item.episode}`, item));
    });
    todayMessage.textContent = todayItems.length ? '' : 'Aucune diffusion prévue aujourd’hui.';

    let currentDay = '';
    upcomingItems.forEach(item => {
        const airingDate = new Date(item.airingAt * 1000);
        const dayKey = getKurocalDateKey(airingDate);
        if (dayKey !== currentDay) {
            currentDay = dayKey;
            const heading = document.createElement('h4');
            heading.className = 'kurocal-overview-day';
            heading.textContent = formatKurocalDate(airingDate);
            upcomingGrid.appendChild(heading);
        }
        const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(airingDate);
        upcomingGrid.appendChild(makeKurocalCard(item.media, `${time} · Ép. ${item.episode}`, item));
    });
    upcomingMessage.textContent = upcomingItems.length ? '' : 'Aucune autre diffusion prévue dans les 7 prochains jours.';
    renderKurocalOverviewNewReleases();
}

async function loadKurocalOverview() {
    const todayGrid = document.getElementById('kurocalOverviewTodayGrid');
    const todayMessage = document.getElementById('kurocalOverviewTodayMessage');
    if (!todayGrid || !todayMessage) return;
    if (kurocalOverviewItems !== null) {
        renderKurocalOverview();
        if (kurocalNewReleaseItems === null) await loadKurocalNewReleases();
        renderKurocalOverviewNewReleases();
        return;
    }

    const requestId = ++kurocalOverviewRequestId;
    const now = new Date();
    const from = Math.floor(now.getTime() / 1000);
    const to = Math.floor(addKurocalDays(now, 7).getTime() / 1000);
    const items = [];
    let page = 1;
    let hasNextPage = true;
    renderKurocalOverview();
    const newReleasesRequest = kurocalNewReleaseItems === null
        ? loadKurocalNewReleases()
        : Promise.resolve();

    try {
        while (hasNextPage && page <= 10) {
            const data = await requestAniList(KUROCAL_SCHEDULE_QUERY, { page, from, to });
            const result = data?.Page;
            if (!result) throw new Error('Réponse AniList incomplète pour la vue À venir.');
            items.push(...(result.airingSchedules || []).filter(item => item.media));
            hasNextPage = Boolean(result.pageInfo?.hasNextPage);
            page++;
        }
        if (requestId !== kurocalOverviewRequestId) return;
        kurocalOverviewItems = items;
        renderKurocalOverview();
        if (hasNextPage) {
            const message = document.getElementById('kurocalOverviewUpcomingMessage');
            if (message) message.textContent = 'Affichage partiel : AniList a renvoyé plus de diffusions que la limite de chargement.';
        }
    } catch (error) {
        if (requestId !== kurocalOverviewRequestId) return;
        console.error('Impossible de charger la vue À venir de Kurocal :', error);
        todayGrid.replaceChildren();
        todayGrid.setAttribute('aria-busy', 'false');
        todayMessage.textContent = 'Les diffusions sont momentanément indisponibles. Vérifie ta connexion puis réessaie.';
        const upcomingGrid = document.getElementById('kurocalOverviewUpcomingGrid');
        const upcomingMessage = document.getElementById('kurocalOverviewUpcomingMessage');
        if (upcomingGrid) {
            upcomingGrid.replaceChildren();
            upcomingGrid.setAttribute('aria-busy', 'false');
        }
        if (upcomingMessage) upcomingMessage.textContent = '';
        showAppToast('Impossible de charger les diffusions depuis AniList.', 'error');
    }

    await newReleasesRequest;
    if (requestId === kurocalOverviewRequestId) {
        renderKurocalOverviewNewReleases();
    }
}

function renderKurocalWeekdays() {
    const weekdayNav = document.getElementById('kurocalWeekdays');
    const heading = document.getElementById('kurocalMonthHeading');
    const selectedDateLabel = document.getElementById('kurocalSelectedDate');
    if (!weekdayNav || !heading || !selectedDateLabel) return;

    weekdayNav.replaceChildren();
    const visibleWeekMiddle = addKurocalDays(kurocalWeekStart, 3);
    heading.textContent = formatKurocalDate(visibleWeekMiddle, { month: 'long', year: 'numeric' });
    heading.textContent = heading.textContent.charAt(0).toLocaleUpperCase('fr-FR') + heading.textContent.slice(1);
    selectedDateLabel.textContent = formatKurocalDate(kurocalSelectedDate);

    for (let index = 0; index < 7; index++) {
        const date = addKurocalDays(kurocalWeekStart, index);
        const key = getKurocalDateKey(date);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'kurocal-weekday';
        button.classList.toggle('active', key === getKurocalDateKey(kurocalSelectedDate));
        button.classList.toggle('is-today', key === getKurocalDateKey(new Date()));
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', String(key === getKurocalDateKey(kurocalSelectedDate)));
        button.setAttribute('aria-label', formatKurocalDate(date));

        const weekday = document.createElement('span');
        weekday.textContent = formatKurocalDate(date, { weekday: 'short' }).replace('.', '');
        const day = document.createElement('strong');
        day.textContent = String(date.getDate());
        button.append(weekday, day);
        button.addEventListener('click', () => {
            kurocalSelectedDate = date;
            renderKurocalWeekdays();
            loadKurocalWeek();
        });
        weekdayNav.appendChild(button);
    }
    weekdayNav.classList.remove('slide-next', 'slide-previous');
    if (kurocalSlideDirection) {
        const directionClass = `slide-${kurocalSlideDirection}`;
        weekdayNav.classList.add(directionClass);
        window.setTimeout(() => weekdayNav.classList.remove(directionClass), 260);
        kurocalSlideDirection = '';
    }
}

function renderKurocalSchedule() {
    const grid = document.getElementById('kurocalScheduleGrid');
    const message = document.getElementById('kurocalScheduleMessage');
    if (!grid || !message) return;
    grid.replaceChildren();
    grid.setAttribute('aria-busy', 'false');
    const favoriteIds = new Set(getKurocalFavorites().map(media => String(media.id)));
    const dayItems = kurocalScheduleItems
        .filter(item => getKurocalDateKey(new Date(item.airingAt * 1000)) === getKurocalDateKey(kurocalSelectedDate))
        .filter(item => !kurocalFavoriteOnly || favoriteIds.has(String(item.media.id)))
        .filter(item => !shouldHideKurocalHentai() || !isKurocalHentai(item.media))
        .sort((first, second) => first.airingAt - second.airingAt);

    if (dayItems.length) {
        message.textContent = '';
        dayItems.forEach(item => {
            const date = new Date(item.airingAt * 1000);
            const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
            grid.appendChild(makeKurocalCard(item.media, `${time} · Ép. ${item.episode}`, item));
        });
    } else if (kurocalFavoriteOnly && kurocalScheduleItems.some(item => getKurocalDateKey(new Date(item.airingAt * 1000)) === getKurocalDateKey(kurocalSelectedDate))) {
        message.textContent = 'Aucune sortie de tes favoris Kurocal ce jour-là.';
    } else {
        message.textContent = 'Aucune diffusion trouvée pour cette journée.';
    }
}

async function loadKurocalWeek(weekStart = kurocalWeekStart) {
    const message = document.getElementById('kurocalScheduleMessage');
    const grid = document.getElementById('kurocalScheduleGrid');
    if (!message || !grid) return;
    const requestId = ++kurocalScheduleRequestId;
    const requestWeekStart = new Date(weekStart);
    const weekKey = getKurocalDateKey(requestWeekStart);
    if (kurocalScheduleCache.has(weekKey)) {
        kurocalScheduleItems = kurocalScheduleCache.get(weekKey);
        renderKurocalSchedule();
        return;
    }

    renderKurocalCardSkeletons(grid);
    message.textContent = '';
    const nextWeek = addKurocalDays(requestWeekStart, 7);
    const from = Math.floor(requestWeekStart.getTime() / 1000);
    const to = Math.floor(nextWeek.getTime() / 1000) - 1;
    const items = [];
    let page = 1;
    let hasNextPage = true;
    const maxPages = 10;

    try {
        while (hasNextPage && page <= maxPages) {
            const data = await requestAniList(KUROCAL_SCHEDULE_QUERY, { page, from, to });
            const result = data?.Page;
            if (!result) throw new Error('Réponse AniList incomplète pour le calendrier.');
            items.push(...(result.airingSchedules || []).filter(item => item.media));
            hasNextPage = Boolean(result.pageInfo?.hasNextPage);
            page++;
        }
        kurocalScheduleCache.set(weekKey, items);
        if (requestId !== kurocalScheduleRequestId) return;
        kurocalScheduleItems = items;
        renderKurocalSchedule();
        if (hasNextPage) {
            message.textContent = 'Affichage partiel : AniList a renvoyé plus de diffusions que la limite de chargement.';
        }
    } catch (error) {
        console.error('Impossible de charger les diffusions Kurocal :', error);
        if (requestId !== kurocalScheduleRequestId) return;
        grid.replaceChildren();
        grid.setAttribute('aria-busy', 'false');
        message.textContent = 'Le calendrier est momentanément indisponible. Vérifie ta connexion puis réessaie.';
        showAppToast('Impossible de charger les diffusions depuis AniList.', 'error');
    }
}

function renderKurocalNewReleases() {
    const grid = document.getElementById('kurocalNewGrid');
    const message = document.getElementById('kurocalNewMessage');
    if (!grid || !message || kurocalNewReleaseItems === null) return;
    grid.replaceChildren();
    grid.setAttribute('aria-busy', 'false');
    if (!kurocalNewReleaseItems.length) {
        message.textContent = 'Aucune nouvelle sortie à afficher pour le moment.';
        return;
    }
    message.textContent = '';
    kurocalNewReleaseItems
        .filter(media => hasKurocalFullStartDate(media.startDate))
        .filter(media => !shouldHideKurocalHentai() || !isKurocalHentai(media))
        .sort((first, second) => {
            const firstDate = new Date(first.startDate.year, first.startDate.month - 1, first.startDate.day);
            const secondDate = new Date(second.startDate.year, second.startDate.month - 1, second.startDate.day);
            return firstDate - secondDate;
        })
        .forEach(media => {
        const start = media.startDate;
        const releaseDate = new Date(start.year, start.month - 1, start.day);
        const meta = formatKurocalDate(releaseDate, { day: 'numeric', month: 'short', year: 'numeric' });
        grid.appendChild(makeKurocalCard(media, meta));
    });
    if (!grid.children.length) message.textContent = 'Aucune nouvelle sortie avec une date précise à afficher pour le moment.';
}

function hasKurocalFullStartDate(startDate) {
    if (!startDate?.year || !startDate?.month || !startDate?.day) return false;
    const date = new Date(startDate.year, startDate.month - 1, startDate.day);
    return date.getFullYear() === startDate.year &&
        date.getMonth() === startDate.month - 1 &&
        date.getDate() === startDate.day;
}

async function loadKurocalNewReleases() {
    const grid = document.getElementById('kurocalNewGrid');
    const message = document.getElementById('kurocalNewMessage');
    if (!grid || !message) return;
    if (kurocalNewReleaseItems !== null) {
        renderKurocalNewReleases();
        return;
    }
    const requestId = ++kurocalNewReleaseRequestId;
    renderKurocalCardSkeletons(grid);
    message.textContent = '';
    try {
        const afterDate = addKurocalDays(new Date(), -1);
        const after = Number(`${afterDate.getFullYear()}${String(afterDate.getMonth() + 1).padStart(2, '0')}${String(afterDate.getDate()).padStart(2, '0')}`);
        const data = await requestAniList(KUROCAL_NEW_RELEASES_QUERY, { after });
        if (requestId !== kurocalNewReleaseRequestId) return;
        const media = data?.Page?.media;
        if (!Array.isArray(media)) throw new Error('Réponse AniList incomplète pour les prochaines sorties.');
        kurocalNewReleaseItems = media.filter(item => hasKurocalFullStartDate(item.startDate));
        renderKurocalNewReleases();
    } catch (error) {
        if (requestId !== kurocalNewReleaseRequestId) return;
        console.error('Impossible de charger les nouvelles sorties Kurocal :', error);
        grid.replaceChildren();
        grid.setAttribute('aria-busy', 'false');
        message.textContent = 'Les nouvelles sorties sont momentanément indisponibles. Réessaie plus tard.';
        showAppToast('Impossible de charger les prochaines sorties depuis AniList.', 'error');
    }
}

async function loadKurocalFavoriteSchedules(favorites, requestId) {
    const savedById = new Map(favorites.map(media => [String(media.id), media]));
    const ids = favorites.map(media => Number(media.id)).filter(Number.isInteger);
    const chunks = [];
    for (let index = 0; index < ids.length; index += 20) chunks.push(ids.slice(index, index + 20));

    const results = [];
    for (const chunk of chunks) {
        const data = await requestAniList(KUROCAL_FAVORITE_SCHEDULE_QUERY, { ids: chunk });
        const mediaItems = data?.Page?.media;
        if (!Array.isArray(mediaItems)) throw new Error('Réponse AniList incomplète pour les favoris Kurocal.');
        results.push(...mediaItems);
    }

    const scheduleItems = results.map(media => {
        const saved = savedById.get(String(media.id)) || {};
        const upcoming = (media.airingSchedule?.nodes || [])
            .filter(item => item.airingAt && item.episode)
            .sort((first, second) => first.airingAt - second.airingAt);
        if (!upcoming.length) return { media: { ...saved, ...media }, episodes: [] };

        const startEpisode = Number(upcoming[0].episode);
        const episodeCount = Number(media.episodes) || 12;
        const finalEpisode = media.episodes ? episodeCount : startEpisode + episodeCount - 1;
        const episodeMap = new Map();
        upcoming.forEach(item => {
            if (item.episode <= finalEpisode) episodeMap.set(Number(item.episode), item);
        });

        const scheduleInterval = upcoming.length > 1
            ? Math.max(1, Math.round((upcoming[1].airingAt - upcoming[0].airingAt) / (upcoming[1].episode - upcoming[0].episode)))
            : 7 * 24 * 60 * 60;
        let previous = upcoming[upcoming.length - 1];
        for (let episode = Number(previous.episode) + 1; episode <= finalEpisode; episode++) {
            const airingAt = previous.airingAt + scheduleInterval;
            const projected = { episode, airingAt, projected: true };
            if (!episodeMap.has(episode)) episodeMap.set(episode, projected);
            previous = projected;
        }

        return {
            media: { ...saved, ...media, genres: media.genres?.length ? media.genres : saved.genres, isAdult: media.isAdult ?? saved.isAdult },
            episodes: [...episodeMap.values()].sort((first, second) => first.airingAt - second.airingAt)
        };
    });
    if (requestId !== kurocalFavoriteScheduleRequestId) return;
    kurocalFavoriteScheduleItems = scheduleItems;
}

function renderKurocalFavorites() {
    const grid = document.getElementById('kurocalFavoritesList');
    const empty = document.getElementById('kurocalFavoritesEmpty');
    const message = document.getElementById('kurocalFavoritesMessage');
    if (!grid || !empty || !message) return;
    const favorites = getKurocalFavorites();
    grid.replaceChildren();
    window.clearInterval(kurocalFavoritesCountdownInterval);
    kurocalFavoritesCountdownInterval = null;
    if (!favorites.length) {
        kurocalFavoriteScheduleRequestId++;
        kurocalFavoriteScheduleItems = [];
        message.hidden = true;
        empty.hidden = false;
        return;
    }
    empty.hidden = true;
    if (!kurocalFavoriteScheduleItems) {
        const requestId = ++kurocalFavoriteScheduleRequestId;
        message.textContent = 'Chargement des épisodes de tes favoris…';
        message.hidden = false;
        return loadKurocalFavoriteSchedules(favorites, requestId)
            .then(() => {
                if (requestId === kurocalFavoriteScheduleRequestId) renderKurocalFavorites();
            })
            .catch(error => {
                if (requestId !== kurocalFavoriteScheduleRequestId) return;
                console.error('Impossible de charger le planning des favoris Kurocal :', error);
                message.textContent = 'Impossible de charger le planning des favoris. Vérifie ta connexion puis réessaie.';
                message.hidden = false;
                showAppToast('Impossible de charger le planning des favoris depuis AniList.', 'error');
            });
        return;
    }
    message.hidden = true;

    const favoriteIds = new Set(favorites.map(media => String(media.id)));
    const datedEpisodes = kurocalFavoriteScheduleItems
        .filter(item => favoriteIds.has(String(item.media.id)))
        .filter(item => !shouldHideKurocalHentai() || !isKurocalHentai(item.media))
        .flatMap(item => item.episodes.map(airing => ({ ...item, airing })))
        .sort((first, second) => first.airing.airingAt - second.airing.airingAt);
    if (!datedEpisodes.length) {
        message.textContent = 'AniList ne fournit pas encore de date de diffusion pour tes favoris.';
        message.hidden = false;
        return;
    }

    let currentDay = '';
    datedEpisodes.forEach(({ media, airing }) => {
        const date = new Date(airing.airingAt * 1000);
        const dayKey = getKurocalDateKey(date);
        if (dayKey !== currentDay) {
            currentDay = dayKey;
            const dayHeading = document.createElement('h3');
            dayHeading.className = 'kurocal-favorites-day';
            dayHeading.textContent = formatKurocalDate(date);
            grid.appendChild(dayHeading);
        }
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'kurocal-favorite-row';
        row.addEventListener('click', () => openKurocalDetail(media, airing));

        const image = document.createElement('img');
        image.src = getKurocalCover(media);
        image.alt = '';
        image.loading = 'lazy';

        const information = document.createElement('span');
        information.className = 'kurocal-favorite-row-info';
        const title = document.createElement('strong');
        title.textContent = getKurocalTitle(media);
        const episode = document.createElement('span');
        episode.className = 'kurocal-favorite-row-episode';
        episode.textContent = `Épisode ${airing.episode}${airing.projected ? ' · date estimée' : ''}`;
        const countdown = document.createElement('span');
        countdown.className = 'kurocal-favorite-row-countdown';
        const countdownLabel = document.createElement('span');
        countdownLabel.className = 'kurocal-favorite-row-countdown-label';
        countdownLabel.textContent = airing.projected ? 'Date estimée · sortie dans' : 'Sortie dans';
        const countdownTime = document.createElement('time');
        countdownTime.className = 'kurocal-favorite-row-time';
        countdownTime.dateTime = date.toISOString();
        countdownTime.dataset.airingAt = String(airing.airingAt);
        countdown.append(countdownLabel, countdownTime);
        information.append(title, episode, countdown);

        row.append(image, information);
        grid.appendChild(row);
    });
    updateKurocalFavoriteCountdowns();
    kurocalFavoritesCountdownInterval = window.setInterval(updateKurocalFavoriteCountdowns, 60000);
}

function formatKurocalFavoriteCountdown(airingAt) {
    const seconds = Math.max(0, airingAt - Math.floor(Date.now() / 1000));
    if (!seconds) return 'Maintenant';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days} j`);
    parts.push(`${String(hours).padStart(2, '0')} h`, `${String(minutes).padStart(2, '0')} min`);
    return parts.join(' · ');
}

function updateKurocalFavoriteCountdowns() {
    document.querySelectorAll('.kurocal-favorite-row-time[data-airing-at]').forEach(time => {
        time.textContent = formatKurocalFavoriteCountdown(Number(time.dataset.airingAt));
    });
}

function splitKurocalTranslationText(text, maxLength = 450) {
    const chunks = [];
    let remaining = text.trim();
    while (remaining.length > maxLength) {
        let splitAt = remaining.lastIndexOf(' ', maxLength);
        if (splitAt < Math.floor(maxLength * 0.6)) splitAt = maxLength;
        chunks.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
}

async function translateKurocalSynopsis(text) {
    const chunks = splitKurocalTranslationText(text);
    const translations = [];
    for (const chunk of chunks) {
        const params = new URLSearchParams({ q: chunk, langpair: 'en|fr' });
        const response = await fetch(`https://api.mymemory.translated.net/get?${params}`);
        const result = await response.json();
        if (!response.ok || result.responseStatus !== 200 || result.quotaFinished) {
            throw new Error(result.responseDetails || 'Le service de traduction est temporairement indisponible.');
        }
        const translated = result.responseData?.translatedText;
        if (!translated) throw new Error('Le service de traduction n’a pas renvoyé de texte.');
        translations.push(translated);
    }
    return translations.join(' ');
}

function updateKurocalSynopsisControls(description, synopsisToggle, translateButton) {
    synopsisToggle.hidden = description.scrollHeight <= description.clientHeight + 1;
    translateButton.hidden = !kurocalSynopsisOriginal || kurocalSynopsisOriginal.length < 3;
}

function collapseKurocalSynopsis(description, synopsisToggle) {
    description.classList.remove('is-expanded');
    synopsisToggle.setAttribute('aria-expanded', 'false');
    synopsisToggle.querySelector('span:last-child').textContent = 'Lire la suite';
    synopsisToggle.querySelector('.material-symbols-rounded').textContent = 'expand_more';
}

async function toggleKurocalSynopsisTranslation() {
    const description = document.getElementById('kurocalDetailDescription');
    const synopsisToggle = document.getElementById('kurocalSynopsisToggle');
    const translateButton = document.getElementById('kurocalTranslateSynopsis');
    const buttonText = translateButton?.querySelector('span:last-child');
    if (!description || !synopsisToggle || !translateButton || !buttonText || !kurocalSynopsisOriginal) return;

    if (kurocalSynopsisTranslated) {
        kurocalSynopsisTranslated = false;
        description.textContent = kurocalSynopsisOriginal;
        collapseKurocalSynopsis(description, synopsisToggle);
        buttonText.textContent = 'Traduire en français';
        synopsisToggle.hidden = true;
        window.requestAnimationFrame(() => updateKurocalSynopsisControls(description, synopsisToggle, translateButton));
        return;
    }

    const cacheKey = `${kurocalCurrentMedia?.id}:${kurocalSynopsisOriginal}`;
    let translated = kurocalSynopsisTranslationCache.get(cacheKey);
    if (!translated) {
        if (kurocalSynopsisOriginal.length > 5000) {
            showAppToast('Ce synopsis dépasse la limite gratuite de traduction.', 'warning');
            return;
        }
        const requestId = ++kurocalTranslationRequestId;
        translateButton.disabled = true;
        buttonText.textContent = 'Traduction…';
        try {
            translated = await translateKurocalSynopsis(kurocalSynopsisOriginal);
            if (requestId !== kurocalTranslationRequestId || document.getElementById('kurocalDetail')?.hidden !== false) return;
            kurocalSynopsisTranslationCache.set(cacheKey, translated);
        } catch (error) {
            if (requestId !== kurocalTranslationRequestId) return;
            console.error('Impossible de traduire le synopsis Kurocal :', error);
            showAppToast('La traduction est indisponible pour le moment. Réessaie plus tard.', 'error');
            buttonText.textContent = 'Traduire en français';
            return;
        } finally {
            if (requestId === kurocalTranslationRequestId) translateButton.disabled = false;
        }
    }

    if (document.getElementById('kurocalDetail')?.hidden !== false) return;
    kurocalSynopsisTranslated = true;
    description.textContent = translated;
    collapseKurocalSynopsis(description, synopsisToggle);
    buttonText.textContent = 'Afficher l’original';
    synopsisToggle.hidden = true;
    window.requestAnimationFrame(() => updateKurocalSynopsisControls(description, synopsisToggle, translateButton));
}

function updateKurocalDetailFavoriteButton() {
    const button = document.getElementById('kurocalDetailFavorite');
    if (!button || !kurocalCurrentMedia) return;
    const favorite = isKurocalFavorite(kurocalCurrentMedia.id);
    button.querySelector('span:last-child').textContent = favorite ? 'Retirer des favoris Kurocal' : 'Ajouter aux favoris Kurocal';
    button.classList.toggle('is-favorite', favorite);
}

function updateKurocalScheduleToggle() {
    const button = document.getElementById('kurocalScheduleToggle');
    if (!button || !kurocalCurrentAiring) return;
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded kurocal-schedule-icon';
    icon.setAttribute('aria-hidden', 'true');
    const date = new Date(kurocalCurrentAiring.airingAt * 1000);
    button.replaceChildren(icon);
    if (kurocalScheduleDisplayMode === 'countdown') {
        icon.textContent = 'hourglass_top';
        const seconds = Math.max(0, kurocalCurrentAiring.airingAt - Math.floor(Date.now() / 1000));
        if (!seconds) {
            const text = document.createElement('span');
            text.className = 'kurocal-schedule-date';
            text.textContent = `Épisode ${kurocalCurrentAiring.episode} diffusé`;
            button.appendChild(text);
            button.title = 'Cliquer pour afficher la date et l’heure';
            return;
        }
        const units = [];
        const days = Math.floor(seconds / 86400);
        if (days) units.push({ value: days, label: days === 1 ? 'jour' : 'jours' });
        units.push(
            { value: Math.floor((seconds % 86400) / 3600), label: 'heures' },
            { value: Math.floor((seconds % 3600) / 60), label: 'minutes' },
            { value: seconds % 60, label: 'secondes' }
        );
        const countdown = document.createElement('span');
        countdown.className = 'kurocal-countdown-content';
        const caption = document.createElement('span');
        caption.className = 'kurocal-countdown-caption';
        caption.textContent = `Avant l’épisode ${kurocalCurrentAiring.episode}`;
        const display = document.createElement('span');
        display.className = 'kurocal-countdown-units';
        units.forEach(unit => {
            const item = document.createElement('span');
            item.className = 'kurocal-countdown-unit';
            const value = document.createElement('strong');
            value.textContent = String(unit.value).padStart(2, '0');
            const label = document.createElement('small');
            label.textContent = unit.label;
            item.append(value, label);
            display.appendChild(item);
        });
        countdown.append(caption, display);
        button.appendChild(countdown);
        button.title = 'Cliquer pour afficher la date et l’heure';
    } else {
        icon.textContent = 'calendar_month';
        const text = document.createElement('span');
        text.className = 'kurocal-schedule-date';
        text.textContent = `${formatKurocalDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date)} · Épisode ${kurocalCurrentAiring.episode}`;
        button.appendChild(text);
        button.title = 'Cliquer pour afficher le compte à rebours';
    }
}

function openKurocalDetail(media, airing = null) {
    const overlay = document.getElementById('kurocalDetail');
    const image = document.getElementById('kurocalDetailImage');
    const title = document.getElementById('kurocalDetailTitle');
    const meta = document.getElementById('kurocalDetailMeta');
    const information = document.getElementById('kurocalDetailInfo');
    const description = document.getElementById('kurocalDetailDescription');
    const synopsisToggle = document.getElementById('kurocalSynopsisToggle');
    const scheduleToggle = document.getElementById('kurocalScheduleToggle');
    const trailerContainer = document.getElementById('kurocalTrailer');
    const favoriteButton = document.getElementById('kurocalDetailFavorite');
    const translateButton = document.getElementById('kurocalTranslateSynopsis');
    const addButton = document.getElementById('kurocalAddToList');
    if (!overlay || !image || !title || !meta || !information || !description || !synopsisToggle || !scheduleToggle || !trailerContainer || !favoriteButton || !translateButton || !addButton) return;

    kurocalTranslationRequestId++;
    kurocalCurrentMedia = media;
    kurocalCurrentAiring = airing;
    kurocalScheduleDisplayMode = 'date';
    kurocalSynopsisOriginal = (media.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    kurocalSynopsisTranslated = false;
    window.clearInterval(kurocalCountdownInterval);
    image.src = getKurocalCover(media);
    image.alt = getKurocalTitle(media);
    title.textContent = getKurocalTitle(media);
    const details = [];
    if (airing) {
        const date = new Date(airing.airingAt * 1000);
        details.push(`${airing.projected ? 'Date estimée · ' : ''}${formatKurocalDate(date)} à ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date)}`);
    } else if (media.startDate?.year) {
        const start = media.startDate;
        details.push(start.month && start.day
            ? formatKurocalDate(new Date(start.year, start.month - 1, start.day), { day: 'numeric', month: 'long', year: 'numeric' })
            : String(start.year));
        details.push('Prochaine sortie');
    }
    meta.textContent = details.join(' · ');

    information.replaceChildren();
    const infoItems = [];
    if (media.genres?.length) infoItems.push(...media.genres.map(genre => ({ label: genre, isGenre: true })));
    if (media.format) infoItems.push({ label: media.format.replaceAll('_', ' ') });
    if (media.episodes) infoItems.push({ label: `${media.episodes} épisodes` });
    else if (airing) infoItems.push({ label: '12 épisodes estimés' });
    infoItems.forEach(item => {
        const badge = document.createElement('span');
        badge.className = item.isGenre ? 'kurocal-info-chip genre' : 'kurocal-info-chip';
        badge.textContent = item.label;
        information.appendChild(badge);
    });

    scheduleToggle.hidden = !airing;
    scheduleToggle.onclick = airing ? () => {
        kurocalScheduleDisplayMode = kurocalScheduleDisplayMode === 'date' ? 'countdown' : 'date';
        updateKurocalScheduleToggle();
    } : null;
    if (airing) {
        updateKurocalScheduleToggle();
        kurocalCountdownInterval = window.setInterval(() => {
            if (kurocalScheduleDisplayMode === 'countdown') updateKurocalScheduleToggle();
        }, 1000);
    }

    description.textContent = kurocalSynopsisOriginal || 'Aucun synopsis fourni.';
    description.classList.remove('is-expanded');
    synopsisToggle.hidden = true;
    synopsisToggle.setAttribute('aria-expanded', 'false');
    synopsisToggle.querySelector('span:last-child').textContent = 'Lire la suite';
    synopsisToggle.querySelector('.material-symbols-rounded').textContent = 'expand_more';
    translateButton.disabled = false;
    translateButton.querySelector('span:last-child').textContent = 'Traduire en français';
    translateButton.hidden = !kurocalSynopsisOriginal || kurocalSynopsisOriginal.length < 3;
    translateButton.onclick = toggleKurocalSynopsisTranslation;
    window.requestAnimationFrame(() => {
        updateKurocalSynopsisControls(description, synopsisToggle, translateButton);
    });
    synopsisToggle.onclick = () => {
        const expanded = description.classList.toggle('is-expanded');
        synopsisToggle.setAttribute('aria-expanded', String(expanded));
        synopsisToggle.querySelector('span:last-child').textContent = expanded ? 'Réduire' : 'Lire la suite';
        synopsisToggle.querySelector('.material-symbols-rounded').textContent = expanded ? 'expand_less' : 'expand_more';
    };

    trailerContainer.replaceChildren();
    trailerContainer.hidden = true;
    if (media.trailer?.site?.toLowerCase() === 'youtube' && media.trailer.id) {
        const trailerHeading = document.createElement('h3');
        trailerHeading.textContent = 'Bande-annonce';
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(media.trailer.id)}`;
        iframe.title = `Bande-annonce de ${getKurocalTitle(media)}`;
        iframe.loading = 'lazy';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        trailerContainer.append(trailerHeading, iframe);
        trailerContainer.hidden = false;
    }

    favoriteButton.onclick = () => toggleKurocalFavorite(media);
    addButton.disabled = false;
    addButton.textContent = 'Ajouter à la Kuroliste';
    addButton.onclick = async () => {
        addButton.disabled = true;
        addButton.textContent = 'Ajout…';
        const isMovie = media.format === 'MOVIE';
        try {
            const added = await addAnime(
                media.id,
                getKurocalCover(media),
                media.title?.native || '',
                media.title?.romaji || getKurocalTitle(media),
                media.title?.english || media.title?.romaji || getKurocalTitle(media),
                media.title?.english ? 'EN' : 'NA',
                'toview',
                isMovie ? '' : 1,
                Number(media.episodes) || 0,
                0,
                0,
                '',
                isMovie,
                isMovie ? formatDurationFromMinutes(media.duration) : '00:00:00',
                0,
                0,
                media.description || ''
            );
            addButton.textContent = added ? 'Ajouté à la Kuroliste' : 'Réessayer';
        } catch (error) {
            console.error('Impossible d’ajouter cet anime à la Kuroliste :', error);
            showAppToast('Impossible d’ajouter cet anime à la Kuroliste.', 'error');
            addButton.textContent = 'Réessayer';
        } finally {
            addButton.disabled = false;
        }
    };
    updateKurocalDetailFavoriteButton();
    overlay.hidden = false;
}

function closeKurocalDetail() {
    const overlay = document.getElementById('kurocalDetail');
    if (overlay) overlay.hidden = true;
    kurocalTranslationRequestId++;
    window.clearInterval(kurocalCountdownInterval);
    kurocalCountdownInterval = null;
    kurocalCurrentMedia = null;
    kurocalCurrentAiring = null;
}

function showKurocalPanel(viewName) {
    const panels = {
        today: 'kurocalOverviewPanel',
        calendar: 'kurocalCalendarPanel',
        new: 'kurocalNewPanel',
        favorites: 'kurocalFavoritesPanel',
        settings: 'kurocalSettingsPanel'
    };
    Object.entries(panels).forEach(([name, id]) => {
        const panel = document.getElementById(id);
        if (panel) panel.hidden = name !== viewName;
    });
    document.querySelectorAll('.kurocal-nav [data-kurocal-view]').forEach(button => {
        button.classList.toggle('active', button.dataset.kurocalView === viewName);
    });
    const subtitle = document.getElementById('kurocalSubtitle');
    if (subtitle) {
        subtitle.textContent = viewName === 'today' ? 'À venir'
            : viewName === 'new' ? 'Nouvelles sorties'
            : viewName === 'favorites' ? 'Tes favoris'
            : viewName === 'settings' ? 'Préférences du calendrier'
            : 'Calendrier des diffusions';
    }
    if (viewName === 'today') {
        loadKurocalOverview();
    } else if (viewName === 'calendar') {
        renderKurocalWeekdays();
        loadKurocalWeek(getKurocalWeekStart(kurocalSelectedDate));
    } else if (viewName === 'new') {
        loadKurocalNewReleases();
    } else if (viewName === 'favorites') {
        renderKurocalFavorites();
    }
}

async function refreshKurocalActiveView() {
    const overviewPanel = document.getElementById('kurocalOverviewPanel');
    const calendarPanel = document.getElementById('kurocalCalendarPanel');
    const newPanel = document.getElementById('kurocalNewPanel');
    const favoritesPanel = document.getElementById('kurocalFavoritesPanel');

    if (overviewPanel && !overviewPanel.hidden) {
        kurocalOverviewItems = null;
        kurocalNewReleaseItems = null;
        await loadKurocalOverview();
        return;
    }
    if (calendarPanel && !calendarPanel.hidden) {
        const selectedWeekStart = getKurocalWeekStart(kurocalSelectedDate);
        kurocalScheduleCache.delete(getKurocalDateKey(selectedWeekStart));
        await loadKurocalWeek(selectedWeekStart);
        return;
    }
    if (newPanel && !newPanel.hidden) {
        kurocalNewReleaseItems = null;
        await loadKurocalNewReleases();
        return;
    }
    if (favoritesPanel && !favoritesPanel.hidden) {
        kurocalFavoriteScheduleItems = null;
        await renderKurocalFavorites();
        return;
    }

    kurocalScheduleCache.delete(getKurocalDateKey(kurocalWeekStart));
    kurocalNewReleaseItems = null;
    const refreshes = [loadKurocalWeek(), loadKurocalNewReleases()];
    kurocalOverviewItems = null;
    kurocalOverviewRequestId++;
    if (getKurocalFavorites().length) {
        kurocalFavoriteScheduleItems = null;
        refreshes.push(renderKurocalFavorites());
    }
    await Promise.all(refreshes);
}

window.refreshKurocalActiveView = refreshKurocalActiveView;

function openKurocal(initialPanel = 'today') {
    const view = document.getElementById('kurocalView');
    if (!view) return;
    document.querySelector('.anime-player-stage video')?.pause();
    const markerFilterPanel = document.getElementById('animeMarkerFilterPanel');
    const markerFilterToggle = document.getElementById('animeMarkerFilterToggle');
    if (markerFilterPanel) markerFilterPanel.hidden = true;
    if (markerFilterToggle) {
        markerFilterToggle.setAttribute('aria-expanded', 'false');
        markerFilterToggle.setAttribute('aria-label', 'Ouvrir les filtres');
    }
    const activePanel = document.querySelector('.view-panel.active');
    kurocalReturnView = activePanel?.id || 'gridAnime';
    view.hidden = false;
    document.body.classList.add('kurocal-active');
    showKurocalPanel(initialPanel);
}

function closeKurocal() {
    closeKurocalDetail();
    const view = document.getElementById('kurocalView');
    if (view) view.hidden = true;
    document.body.classList.remove('kurocal-active');
    showView(kurocalReturnView);
}

function moveKurocalWeek(amount) {
    kurocalWeekStart = addKurocalDays(kurocalWeekStart, amount * 7);
    kurocalSlideDirection = amount > 0 ? 'next' : 'previous';
    renderKurocalWeekdays();
}

function swipeKurocalDay(amount) {
    if (!amount) return;
    kurocalSelectedDate = addKurocalDays(kurocalSelectedDate, amount);
    const nextWeekStart = getKurocalWeekStart(kurocalSelectedDate);
    if (getKurocalDateKey(kurocalWeekStart) !== getKurocalDateKey(nextWeekStart)) {
        kurocalWeekStart = nextWeekStart;
        kurocalSlideDirection = amount > 0 ? 'next' : 'previous';
    }
    renderKurocalWeekdays();
    loadKurocalWeek(nextWeekStart);
}

window.swipeKurocalDay = swipeKurocalDay;

function initializeMainSettings() {
    const startupViewInputs = document.querySelectorAll('input[name="startupViewSetting"]');
    const searchHideHentai = document.getElementById('searchHideHentai');
    const rememberLogin = document.getElementById('rememberLoginSetting');

    if (startupViewInputs.length) {
        const savedStartupView = localStorage.getItem('kuroniStartupView');
        const selectedStartupView = savedStartupView === 'kurocal' ? 'kurocal' : 'gridAnime';
        startupViewInputs.forEach(input => {
            input.checked = input.value === selectedStartupView;
            input.addEventListener('change', () => {
                if (!input.checked) return;
                try {
                    localStorage.setItem('kuroniStartupView', input.value);
                } catch (error) {
                    console.error('Impossible d’enregistrer la page de démarrage :', error);
                    startupViewInputs.forEach(option => {
                        option.checked = option.value === selectedStartupView;
                    });
                    showAppToast('Impossible d’enregistrer ce réglage sur cet appareil.', 'error');
                }
            });
        });
    }

    if (searchHideHentai) {
        searchHideHentai.checked = localStorage.getItem('kuroniHideHentaiSearch') !== 'false';
        searchHideHentai.addEventListener('change', () => {
            const previousValue = !searchHideHentai.checked;
            try {
                localStorage.setItem('kuroniHideHentaiSearch', String(searchHideHentai.checked));
                const query = document.getElementById('searchQuery')?.value.trim();
                if (query) searchAnime(query);
            } catch (error) {
                console.error('Impossible d’enregistrer le filtre hentai de recherche :', error);
                searchHideHentai.checked = previousValue;
                showAppToast('Impossible d’enregistrer ce réglage sur cet appareil.', 'error');
            }
        });
    }

    if (rememberLogin) {
        rememberLogin.checked = localStorage.getItem('kuroniRememberLogin') === 'true';
        rememberLogin.addEventListener('change', () => {
            const previousValue = !rememberLogin.checked;
            try {
                localStorage.setItem('kuroniRememberLogin', String(rememberLogin.checked));
                if (rememberLogin.checked) {
                    localStorage.setItem('username', sessionStorage.getItem('username') || '');
                } else {
                    localStorage.removeItem('username');
                }
            } catch (error) {
                console.error('Impossible d’enregistrer le réglage de connexion :', error);
                rememberLogin.checked = previousValue;
                showAppToast('Impossible d’enregistrer ce réglage sur cet appareil.', 'error');
            }
        });
    }
}

function openPasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (!modal) return;
    const form = document.getElementById('changePasswordForm');
    form?.reset();
    const status = document.getElementById('changePasswordStatus');
    if (status) {
        status.textContent = '';
        status.classList.remove('error');
    }
    modal.hidden = false;
    document.body.classList.add('password-modal-open');
    document.getElementById('currentPassword')?.focus();
}

function closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('password-modal-open');
    document.getElementById('changePasswordForm')?.reset();
    const status = document.getElementById('changePasswordStatus');
    if (status) {
        status.textContent = '';
        status.classList.remove('error');
    }
    document.querySelector('.settings-account-button')?.focus();
}

function initializeKurocal() {
    const hideHentai = document.getElementById('kurocalHideHentai');
    if (hideHentai) {
        hideHentai.checked = shouldHideKurocalHentai();
        hideHentai.addEventListener('change', () => setKurocalHentaiFilter(hideHentai.checked));
    }
    document.getElementById('kurocalFavoritesImport')?.addEventListener('change', async event => {
        const input = event.currentTarget;
        await importKurocalFavorites(input.files?.[0]);
        input.value = '';
    });
    document.getElementById('kurocalPreviousWeek')?.addEventListener('click', () => moveKurocalWeek(-1));
    document.getElementById('kurocalNextWeek')?.addEventListener('click', () => moveKurocalWeek(1));
    document.getElementById('kurocalFavoriteFilter')?.addEventListener('click', event => {
        kurocalFavoriteOnly = !kurocalFavoriteOnly;
        event.currentTarget.setAttribute('aria-pressed', String(kurocalFavoriteOnly));
        renderKurocalSchedule();
    });
    document.querySelectorAll('.kurocal-nav [data-kurocal-view]').forEach(button => {
        button.addEventListener('click', () => {
            showKurocalPanel(button.dataset.kurocalView);
        });
    });
    document.getElementById('kurocalOverviewAllNew')?.addEventListener('click', () => showKurocalPanel('new'));
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !document.body.classList.contains('kurocal-active')) return;
        const detail = document.getElementById('kurocalDetail');
        if (detail && !detail.hidden) closeKurocalDetail();
        else closeKurocal();
    });
    renderKurocalWeekdays();
}

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('kurolisteJsonImport')?.addEventListener('change', async event => {
        const input = event.currentTarget;
        await importKurolisteJson(input.files?.[0]);
        input.value = '';
    });

    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
        let searchTimeout = null;
        const scheduleSearch = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchAnime(searchInput.value.trim());
            }, 300);
        };
        searchInput.addEventListener('input', scheduleSearch);
    }

    const imageInput = document.getElementById('manual-image-url');
    const fileInput = document.getElementById('manual-image-file');
    const preview = document.getElementById('manual-image-preview');
    const previewWrap = document.getElementById('manual-image-preview-wrap');
    const showPreview = source => {
        preview.onload = () => previewWrap.classList.add('has-image');
        preview.onerror = () => {
            preview.removeAttribute('src');
            previewWrap.classList.remove('has-image');
        };
        preview.src = source;
    };

    if (imageInput && fileInput && preview && previewWrap) {
        imageInput.addEventListener('input', () => {
            const url = imageInput.value.trim();
            if (url) fileInput.value = '';
            if (!url) {
                preview.removeAttribute('src');
                previewWrap.classList.remove('has-image');
                return;
            }
            showPreview(url);
        });

        fileInput.addEventListener('change', () => {
            const file = fileInput.files?.[0];
            if (!file) return;
            imageInput.value = '';
            showPreview(URL.createObjectURL(file));
        });
    }

    toggleManualTypeFields();
    initializeMainSettings();
    document.getElementById('changePasswordForm')?.addEventListener('submit', submitPasswordChange);
    initializeKurocal();
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closePasswordModal();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            document.querySelector('.anime-player-stage video')?.pause();
        }
    });
    if (localStorage.getItem('kuroniStartupView') === 'kurocal') {
        openKurocal('calendar');
    }
});
