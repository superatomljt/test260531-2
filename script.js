const API_KEY = 'd1058f1b9bb34bdc51676d8c1417ceaff39ed16c20465346cee76d870adf9120';

// 부산 구/동 계층형 좌표 데이터
const busanLocations = {
    "부산진구": {
        "부전동": { nx: 98, ny: 77 },
        "전포동": { nx: 98, ny: 77 },
        "연지동": { nx: 98, ny: 76 }
    },
    "해운대구": {
        "우동": { nx: 99, ny: 75 },
        "중동": { nx: 100, ny: 75 },
        "좌동": { nx: 100, ny: 75 }
    },
    "금정구": {
        "구서동": { nx: 98, ny: 78 },
        "장전동": { nx: 98, ny: 77 },
        "부곡동": { nx: 98, ny: 77 }
    },
    "동래구": {
        "온천동": { nx: 98, ny: 76 },
        "사직동": { nx: 98, ny: 76 },
        "명륜동": { nx: 98, ny: 76 }
    },
    "수영구": {
        "광안동": { nx: 99, ny: 75 },
        "남천동": { nx: 99, ny: 74 }
    },
    "중구": {
        "남포동": { nx: 97, ny: 74 },
        "중앙동": { nx: 97, ny: 74 }
    }
};

const guSelect = document.getElementById('gu-select');
const dongSelect = document.getElementById('dong-select');

// 1. 초기 '구' 목록 세팅 함수
function initSelectOptions() {
    // 구 목록 채우기
    const guList = Object.keys(busanLocations);
    guList.forEach(gu => {
        const option = document.createElement('option');
        option.value = gu;
        option.textContent = gu;
        guSelect.appendChild(option);
    });

    // 첫 번째 구의 '동' 목록 채우기
    updateDongOptions(guList[0]);
}

// 2. 선택된 '구'에 맞춰 '동' 목록 업데이트 함수
function updateDongOptions(selectedGu) {
    // 기존 동 목록 초기화
    dongSelect.innerHTML = '';
    
    // 해당 구에 속한 동 목록 가져오기
    const dongList = Object.keys(busanLocations[selectedGu]);
    dongList.forEach(dong => {
        const option = document.createElement('option');
        option.value = dong;
        option.textContent = dong;
        dongSelect.appendChild(option);
    });
}

// 3. 기상청 API 시간 계산 로직 (매시 40분 기준)
function getKmaDateTime() {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let day = now.getDate();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    if (minutes < 40) {
        hours -= 1;
        if (hours < 0) {
            const yesterday = new Date(now.setDate(now.getDate() - 1));
            year = yesterday.getFullYear();
            month = yesterday.getMonth() + 1;
            day = yesterday.getDate();
            hours = 23;
        }
    }

    const baseDate = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    const baseTime = `${String(hours).padStart(2, '0')}00`;
    const displayTime = `${month}월 ${day}일 ${hours}시 기준`;

    return { baseDate, baseTime, displayTime };
}

// 4. 날씨 데이터 호출 함수
async function fetchWeather() {
    const checkBtn = document.getElementById('check-btn');
    const errorEl = document.getElementById('error-message');
    
    const selectedGu = guSelect.value;
    const selectedDong = dongSelect.value;
    const { nx, ny } = busanLocations[selectedGu][selectedDong];

    checkBtn.innerText = "조회 중...";
    checkBtn.disabled = true;
    errorEl.classList.add('hidden');

    const { baseDate, baseTime, displayTime } = getKmaDateTime();
    document.getElementById('time-display').innerText = `${selectedGu} ${selectedDong} | ${displayTime}`;

    const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${API_KEY}&pageNo=1&numOfRows=10&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.response.header.resultCode !== '00') {
            throw new Error(data.response.header.resultMsg);
        }

        const items = data.response.body.items.item;
        const weatherData = {};
        
        items.forEach(item => {
            weatherData[item.category] = item.obsrValue;
        });

        updateUI(weatherData);

    } catch (error) {
        console.error("날씨 조회 실패:", error);
        errorEl.innerText = "데이터를 불러올 수 없습니다. 네트워크나 API 키를 확인해주세요.";
        errorEl.classList.remove('hidden');
    } finally {
        checkBtn.innerText = "조회";
        checkBtn.disabled = false;
    }
}

// 5. UI 업데이트 함수
function updateUI(data) {
    document.getElementById('temp').innerText = data.T1H;
    document.getElementById('humidity').innerText = `${data.REH}%`;
    document.getElementById('wind').innerText = `${data.WSD} m/s`;
    
    const rainValue = parseFloat(data.RN1) === 0 ? '-' : `${data.RN1} mm`;
    document.getElementById('rain').innerText = rainValue;

    const ptyCode = data.PTY;
    let statusText = "☀️ 맑음 / ☁️ 구름"; 
    
    if (ptyCode === '1') statusText = "🌧️ 비";
    else if (ptyCode === '2') statusText = "🌨️ 비와 눈";
    else if (ptyCode === '3') statusText = "❄️ 눈";
    else if (ptyCode === '5') statusText = "💧 빗방울";
    else if (ptyCode === '6') statusText = "🌨️ 빗방울 눈날림";
    else if (ptyCode === '7') statusText = "❄️ 눈날림";
    
    document.getElementById('status').innerText = statusText;
}

// --- 이벤트 리스너 등록 및 초기 실행 ---

// 구(Gu) 선택이 바뀔 때 동(Dong) 목록 자동 갱신
guSelect.addEventListener('change', (e) => {
    updateDongOptions(e.target.value);
});

// 조회 버튼 클릭 시 데이터 호출
document.getElementById('check-btn').addEventListener('click', fetchWeather);

// 스크립트 로드 시 초기 셋팅 후 바로 첫 번째 지역 날씨 호출
initSelectOptions();
fetchWeather();
