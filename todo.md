# Couple App - TODO

## Phase 1: DB Schema & Migration
- [x] 커플 페어링 테이블 (couple_pairs, invite_codes)
- [x] 디데이 테이블 (ddays)
- [x] 채팅 메시지 테이블 (chat_messages)
- [x] 위치 공유 테이블 (locations)
- [x] 하우징 상태 테이블 (housing_states)
- [x] 펫/식물 테이블 (couple_pets)
- [x] 앨범 테이블 (albums, album_photos)
- [x] 기념일 알림 테이블 (anniversaries)
- [x] 프로필 배경화면 컬럼 추가 (users.profileBg)
- [x] DB 마이그레이션 실행

## Phase 2: Server Routers
- [x] 커플 페어링 API (초대 코드 생성/수락, 페어 조회)
- [x] 디데이 API (설정, 조회, 수정)
- [x] 채팅 API (메시지 전송, 목록 조회, 읽음 처리, 이미지 첨부)
- [x] 위치 공유 API (위치 업데이트, 상대방 위치 조회)
- [x] 하우징 API (아이템 배치, 상태 저장/조회)
- [x] 펫 API (상태 조회, 먹이주기, 성장 처리)
- [x] 앨범 API (사진 업로드, AI 캡션 생성, 앨범 조회)
- [x] 기념일 알림 API (등록, 조회, 자동 알림 스케줄)
- [x] 프로필 API (배경화면 업로드/조회)

## Phase 3: Frontend UI
- [x] 글로벌 스타일 (스칸디나비안 디자인 시스템, CSS 변수)
- [x] 앱 레이아웃 및 하단 네비게이션 바
- [x] 로그인 페이지 (Google OAuth via Manus)
- [x] 페어링 페이지 (초대 코드 생성/입력)
- [x] 홈 화면 (디데이 카운터, 커플 정보)
- [x] 채팅 페이지 (실시간 1:1 채팅, 이미지 첨부)
- [x] 위치 공유 페이지 (Google Maps 연동)
- [x] 하우징 페이지 (드래그앤드롭 가구 배치)
- [x] 펫 페이지 (펫 상태, 먹이주기, 성장 단계)
- [x] 앨범 페이지 (사진 업로드, AI 캡션, 갤러리)
- [x] 기념일 페이지 (날짜 등록, 알림 설정)
- [x] 프로필 페이지 (배경화면 업로드, 개인 정보)

## Phase 4: PWA
- [x] manifest.json 설정
- [x] Service Worker 구현 (오프라인 캐싱, 이미지 캐싱)
- [x] 설치 가능한 PWA 구성 (아이콘, 메타태그)

## Phase 5: Tests & Deploy
- [x] Vitest 테스트 작성 (9개 테스트 통과)
- [x] 체크포인트 저장 (version: 5e84079b)
- [x] 배포 URL 전달


## Design Refresh - 여성스럽고 아기자기한 감성
- [x] 컬러 팔레트 변경 (핑크/라벤더/크림 톤)
- [x] 글로벌 CSS 변수 업데이트
- [x] 모든 페이지 UI 리뉴얼 (App.tsx, Home.tsx)
- [x] PWA 아이콘 재생성
- [x] 최종 배포


## Bug Fixes & Improvements
- [x] 아이콘 개선 (아기자기한 캐릭터 스타일)
- [x] 커플 이미지 캐릭터화 (위에 하트)
- [x] 위치 공유 실시간 요청 방식 변경 (자동 공유 → 요청 후 표시)
- [x] 채팅 기능 정상 동작 확인
- [x] 최종 배포


## Critical Fixes - 사용자 피드백
- [x] WebSocket 실시간 채팅 구현 (Socket.io)
- [x] 채팅 창 UI 완성 (메시지 표시, 입력창, 실시간 동기화)
- [x] 프로필 기본 아이콘 생성 및 적용
- [x] 홈 화면 디데이 아이콘 생성 및 적용
- [x] 하우징 + 펫 기능 통합 (HomePet 페이지)
- [x] 채팅을 우측 상단 팝업으로 변경
- [x] 전체 UI 간소화 및 고급스러운 디자인
- [x] 최종 배포
