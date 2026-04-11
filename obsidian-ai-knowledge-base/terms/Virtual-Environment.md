Virtual-Environment

# Virtual-Environment

## 정의
가상 환경(virtual environment)은 컴퓨터 시스템 내에서 독립적으로 동작하는 격리된 Python 실행 환경을 의미한다. 각 프로젝트마다 별도의 패키지(package)와 의존성(dependency)을 관리할 수 있어 프로젝트 간 충돌을 방지한다.

## 왜 중요한가
실무에서 여러 프로젝트를 동시에 진행할 때 패키지 버전 충돌로 인한 오류를 예방하고, 재현 가능한 개발 환경(reproducible environment)을 구축하는 데 필수적이다. 팀 협업 시 일관된 환경 설정을 보장한다.

## 관련 개념
- **상위 개념**: [[Dependency-Management]](의존성 관리)
- **하위 개념**:
  - [[venv]](Python 내장 가상 환경 도구)
  - [[Conda]](Anaconda 기반 환경 관리자)
- **연관 개념**:
  - [[Python]](파이썬)
  - [[Package-Manager]](패키지 관리자)
  - [[Docker]](도커)

## 비유로 이해하기
각 집에 독립적인 수도·가스 공급 시스템을 갖춘 것처럼, 각 프로젝트가 필요한 라이브러리(library)만 설치하고 다른 프로젝트에 영향을 주지 않는다.

## 실제 사용 예시
```bash
python -m venv myproject_env  # 가상 환경 생성
source myproject_env/bin/activate  # 활성화
pip install tensorflow==2.10.0  # 프로젝트별 특정 버전 설치
```