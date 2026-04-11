venv

# venv

## 정의
Python 프로젝트별로 독립적인 패키지 환경을 만드는 가상 환경(virtual environment) 도구이다. 각 프로젝트마다 필요한 라이브러리의 버전을 따로 관리할 수 있어 의존성 충돌을 방지한다.

## 왜 중요한가
여러 프로젝트를 진행할 때 패키지 버전 충돌로 인한 오류를 근본적으로 해결할 수 있으며, 재현 가능한(reproducible) 개발 환경을 구축할 수 있다.

## 관련 개념
- 상위 개념: [[Virtual-Environment]](가상 환경)
- 하위 개념: 
  - [[venv-activation]](venv 활성화)
  - [[pip]](pip - 패키지 관리자)
- 연관 개념: 
  - [[Requirements.txt]](requirements.txt)
  - [[Conda]](conda)
  - [[Docker]](Docker)

## 비유로 이해하기
집에서 여러 요리를 하는데, 각 요리마다 독립적인 조리 도구 세트를 따로 구비하는 것처럼, 각 Python 프로젝트마다 필요한 라이브러리만 따로 설치하는 것이다.

## 실제 사용 예시
```bash
python -m venv myenv           # 가상 환경 생성
source myenv/bin/activate      # 활성화 (macOS/Linux)
pip install django==4.0        # 프로젝트별 패키지 설치
```