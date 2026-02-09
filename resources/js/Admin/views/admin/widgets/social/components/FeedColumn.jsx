import gallery12 from '@admin/assets/images/gallery/12.jpg';
import gallery2 from '@admin/assets/images/gallery/2.jpg';
import gallery5 from '@admin/assets/images/gallery/5.jpg';
import gallery7 from '@admin/assets/images/gallery/7.jpg';
import gallery8 from '@admin/assets/images/gallery/8.jpg';
import user1 from '@admin/assets/images/users/user-1.jpg';
import user10 from '@admin/assets/images/users/user-10.jpg';
import user2 from '@admin/assets/images/users/user-2.jpg';
import user3 from '@admin/assets/images/users/user-3.jpg';
import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import user6 from '@admin/assets/images/users/user-6.jpg';
import user7 from '@admin/assets/images/users/user-7.jpg';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Button, Card, CardBody, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Form, Row } from 'react-bootstrap';
const FeedColumn = () => {
  return <>
      <Card>
        <CardBody>
          <div className="d-flex align-items-center mb-3">
            <div className="flex-grow-1">
              <h5 className="fw-semibold mb-0">Create a Post</h5>
              <span className="text-muted fs-xs">Share updates with your network</span>
            </div>
          </div>
          <Form>
            <div className="position-relative">
              <textarea rows={3} className="form-control rounded-3" placeholder="Write something meaningful..." />
            </div>
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="d-flex gap-2">
                <Button size="sm" variant="light" type="button" className="d-flex align-items-center gap-1 px-2">
                  <Icon icon="user" className="fs-md" />
                  <span className="d-none d-sm-inline">Tag</span>
                </Button>
                <Button size="sm" variant="light" type="button" className="d-flex align-items-center gap-1 px-2">
                  <Icon icon="map-pin" className="fs-md" />
                  <span className="d-none d-sm-inline">Location</span>
                </Button>
                <Button size="sm" variant="light" type="button" className="d-flex align-items-center gap-1 px-2">
                  <Icon icon="camera" className="fs-md" />
                  <span className="d-none d-sm-inline">Photo</span>
                </Button>
                <Button size="sm" variant="light" type="button" className="d-flex align-items-center gap-1 px-2">
                  <Icon icon="mood-smile" className="fs-md" />
                  <span className="d-none d-sm-inline">Feeling</span>
                </Button>
              </div>

              <Button size="sm" variant="primary" type="submit" className="px-3">
                Publish
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <div className="bg-primary-subtle text-primary py-3 px-4 position-relative">
          <h4 className="fw-bold mb-0">Achievement Unlocked</h4>
          <span className="position-absolute top-50 end-0 translate-middle-y text-bg-warning fw-semibold px-2 py-1 rounded-start">🏅 Level Up</span>
        </div>

        <CardBody className="text-center py-4">
          <div className="mb-3">
            <h1 className="display-6 mb-0">💡</h1>
          </div>
          <h4 className="fw-semibold mb-1">Impressive Progress, __username__!</h4>
          <p className="text-muted mb-4">
            You’ve just reached <strong>Milestone Tier 3</strong> for your outstanding activity. Keep up the great momentum!
          </p>

          <div className="d-flex justify-content-center gap-2 mb-4">
            <div className="px-3 py-2 rounded border border-dashed">
              <h6 className="mb-0 text-muted">Achievements</h6>
              <div className="fw-bold fs-5">28</div>
            </div>
            <div className="px-3 py-2 rounded border border-dashed">
              <h6 className="mb-0 text-muted">Followers</h6>
              <div className="fw-bold fs-5">7,840</div>
            </div>
            <div className="px-3 py-2 rounded border border-dashed">
              <h6 className="mb-0 text-muted">Score</h6>
              <div className="fw-bold fs-5">1,920</div>
            </div>
          </div>

          <div className="d-flex justify-content-center gap-2">
            <Button variant="outline-primary" size="sm">
              <Icon icon="share" className="me-1" />
              Share
            </Button>
            <Button variant="success" size="sm">
              <Icon icon="user" className="me-1" />
              Profile
            </Button>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="pb-2">
          <div className="d-flex align-items-center mb-2">
            <img className="me-2 avatar-md rounded-circle" src={user10} alt="Generic placeholder image" />
            <div className="w-100">
              <h5 className="m-0">
                <Link to="" className="link-reset">
                  Sophia Martinez
                </Link>
              </h5>
              <p className="text-muted mb-0">
                <small>about 5 minutes ago</small>
              </p>
            </div>
            <Dropdown className="ms-auto">
              <DropdownToggle as="a" className="text-muted drop-arrow-none card-drop p-0 content-none">
                <Icon icon="dots-vertical" className="fs-lg" />
              </DropdownToggle>
              <DropdownMenu align="end">
                <DropdownItem>
                  <Icon icon="edit" className="me-2" />
                  Edit Post
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="trash" className="me-2" />
                  Delete Post
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="share" className="me-2" />
                  Share
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="pin" className="me-2" />
                  Pin to Top
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="flag" className="me-2" />
                  Report Post
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          <p>Story inspired by the beauty of changing seasons — a nature-themed animation coming soon!</p>
          <Row className="g-2">
            <Col xs="12">
              <img src={gallery5} alt="" className="img-fluid w-100 rounded-3" style={{
              height: 260,
              objectFit: 'cover'
            }} />
            </Col>
            <Col xs="6">
              <img src={gallery7} alt="" className="img-fluid w-100 rounded-3" style={{
              height: 150,
              objectFit: 'cover'
            }} />
            </Col>
            <Col xs="6">
              <img src={gallery8} alt="" className="img-fluid w-100 rounded-3" style={{
              height: 150,
              objectFit: 'cover'
            }} />
            </Col>
          </Row>
          <div className="mt-2">
            <a href="" className="btn btn-sm fs-sm btn-link text-muted">
              <Icon icon="corner-up-left" className="me-1" />
              Reply
            </a>
            <span className="btn btn-sm fs-sm btn-link text-muted" data-toggler="on">
              <span data-toggler-on className="align-middle">
                <Icon icon="heart-filled" className="text-danger" />
                Liked!
              </span>
              <span data-toggler-off className="d-none align-middle">
                <Icon icon="heart" className="text-muted" />
                Like
              </span>
            </span>
            <a href="" className="btn btn-sm fs-sm btn-link text-muted">
              <Icon icon="share" className="me-1" />
              Share
            </a>
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardBody className="pb-0">
          <div className="d-flex align-items-center">
            <img src={user4} className="avatar-md rounded-circle me-2" alt="User" />
            <div className="flex-grow-1">
              <h5 className="m-0">
                <Link to="" className="link-reset">
                  Liam Anderson
                </Link>
              </h5>
              <p className="text-muted mb-0">
                <small>30 minutes ago</small>
              </p>
            </div>

            <Dropdown>
              <DropdownToggle as="a" className="text-muted drop-arrow-none card-drop p-0 content-none">
                <Icon icon="dots-vertical" className="fs-lg" />
              </DropdownToggle>
              <DropdownMenu align="end">
                <DropdownItem>
                  <Icon icon="edit" className="me-2" />
                  Edit
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="trash" className="me-2" />
                  Delete
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="share" className="me-2" />
                  Share
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="pin" className="me-2" />
                  Pin
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="flag" className="me-2" />
                  Report
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>

          <div className="border-start border-3 border-primary ps-3 mt-3 mb-4">
            <p className="text-muted mb-0 fst-italic fs-15">
              <Icon icon="quote" className="me-2 fs-20 opacity-75" />
              Discovering peaceful nature trails today — captured some beautiful shots I can't wait to share. 🌲✨
            </p>
          </div>
        </CardBody>

        <div className="bg-light-subtle px-3 py-3 border-top">
          <div className="d-flex align-items-start mb-3">
            <img src={user5} className="avatar-sm rounded-circle me-3" alt="User" />
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between">
                <h6 className="fw-semibold mb-0 fs-sm">
                  <Link to="" className="link-reset">
                    Ethan Reynolds
                  </Link>
                </h6>
                <small className="text-muted">20 minutes ago</small>
              </div>
              <p className="mb-1 text-muted">This sounds amazing! Excited to see the photos — the last set you shared was incredible.</p>
              <Link to="" className="small text-muted">
                <Icon icon="corner-up-left" className="me-1" />
                Reply
              </Link>

              <div className="d-flex align-items-start mt-3 ps-4 border-start">
                <img src={user6} className="avatar-sm rounded-circle me-3" alt="User" />
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between">
                    <h6 className="fw-semibold fs-sm mb-0">
                      <a href="#!" className="link-reset">
                        Mia Thompson
                      </a>
                    </h6>
                    <small className="text-muted">12 minutes ago</small>
                  </div>
                  <p className="mb-0 text-muted">
                    I hiked there last month! Those trails are perfect for photography — can't wait to see your shots!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center mt-3">
            <img src={user3} className="avatar-sm rounded-circle me-2" alt="User" />
            <input type="text" className="form-control form-control-sm rounded-pill" placeholder="Write a comment..." />
          </div>
        </div>

        <div className="p-2">
          <Link to="" className="btn btn-sm fs-sm btn-link text-muted">
            <Icon icon="corner-up-left" className="me-1" />
            Reply
          </Link>
          <span className="btn btn-sm fs-sm btn-link text-muted" data-toggler="on">
            <span data-toggler-on className="align-middle">
              <Icon icon="heart-filled" className="text-danger" />
              Liked!
            </span>
            <span data-toggler-off className="d-none align-middle">
              <Icon icon="heart" className="text-muted" />
              Like
            </span>
          </span>
          <Link to="" className="btn btn-sm fs-sm btn-link text-muted">
            <Icon icon="share" className="me-1" />
            Share
          </Link>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="position-relative">
          <img src={gallery2} className="img-fluid w-100" style={{
          height: 180,
          objectFit: 'cover'
        }} alt="Event Banner" />
          <span className="badge bg-primary position-absolute top-0 start-0 m-3 px-3 py-2 rounded-pill">📸 Photography Event</span>

          <Dropdown className="position-absolute top-0 end-0 m-3">
            <DropdownToggle as="a" className="text-muted drop-arrow-none card-drop p-0 content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="edit" className="me-2" />
                Edit
              </DropdownItem>
              <DropdownItem>
                <Icon icon="trash" className="me-2" />
                Delete
              </DropdownItem>
              <DropdownItem>
                <Icon icon="share" className="me-2" />
                Share
              </DropdownItem>
              <DropdownItem>
                <Icon icon="pin" className="me-2" />
                Pin
              </DropdownItem>
              <DropdownItem>
                <Icon icon="flag" className="me-2" />
                Report
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        <CardBody>
          <div className="d-flex align-items-center mb-3">
            <img src={user2} className="avatar-md rounded-circle me-2" alt="User" />
            <div>
              <h5 className="fw-semibold mb-0">
                <a href="#!" className="link-reset">
                  Anika Roy
                </a>
              </h5>
              <small className="text-muted">2 hours ago</small>
            </div>
          </div>

          <h4 className="fw-bold mb-2">Nature Photography Workshop 2025</h4>
          <p className="text-muted">
            A weekend event designed for photographers and outdoor lovers to learn, collaborate, and capture stunning nature moments together.
          </p>

          <Row className="g-2 mb-3">
            <Col xs="12" md="4">
              <div className="bg-light-subtle border border-light-subtle border-dashed rounded-3 p-3 h-100">
                <small className="text-muted text-uppercase fw-bold">Date</small>
                <div className="fw-semibold mt-1">14 September 2025</div>
              </div>
            </Col>
            <Col xs="12" md="4">
              <div className="bg-light-subtle border border-light-subtle border-dashed rounded-3 p-3 h-100">
                <small className="text-muted text-uppercase fw-bold">Time</small>
                <div className="fw-semibold mt-1">10:00 AM – 4:00 PM</div>
              </div>
            </Col>
            <Col xs="12" md="4">
              <div className="bg-light-subtle border border-light-subtle border-dashed rounded-3 p-3 h-100">
                <small className="text-muted text-uppercase fw-bold">Location</small>
                <div className="fw-semibold mt-1">Green Valley National Park</div>
              </div>
            </Col>
          </Row>

          <div className="d-flex justify-content-center gap-2 mt-2">
            <button className="btn btn-outline-primary btn-sm">
              <Icon icon="bell" className="me-1" /> Remind Me
            </button>
            <button className="btn btn-primary btn-sm">
              <Icon icon="user-plus" className="me-1" /> Register
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pb-2">
          <div className="d-flex align-items-center mb-2">
            <img className="me-2 avatar-sm rounded-circle" src={user1} alt="Profile photo of Anika Roy" />
            <div className="w-100">
              <h5 className="m-0">
                <Link to="" className="link-reset">
                  __username__
                </Link>
              </h5>
              <p className="text-muted mb-0">
                <small>Posted 2 hours ago</small>
              </p>
            </div>
            <Dropdown className="ms-auto">
              <DropdownToggle as="a" className="text-muted drop-arrow-none card-drop p-0 content-none">
                <Icon icon="dots-vertical" className="fs-lg" />
              </DropdownToggle>
              <DropdownMenu align="end">
                <DropdownItem>
                  <Icon icon="edit" className="me-2" />
                  Edit Post
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="trash" className="me-2" />
                  Delete Post
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="share" className="me-2" />
                  Share
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="pin" className="me-2" />
                  Pin to Top
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="flag" className="me-2" />
                  Report Post
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          <p>Sharing a couple of timelapses from my recent Iceland trip. Let me know which one you like most!</p>
          <div className="ratio ratio-16x9 rounded overflow-hidden">
            <iframe src="https://player.vimeo.com/video/1084537" allowFullScreen />
          </div>
          <div className="mt-2">
            <a href="" className="btn btn-sm fs-sm btn-link text-muted">
              <Icon icon="corner-up-left" className="me-1" />
              Reply
            </a>
            <span className="btn btn-sm fs-sm btn-link text-muted" data-toggler="on">
              <span data-toggler-on className="align-middle">
                <Icon icon="heart-filled" className="text-danger" />
                Liked!
              </span>
              <span data-toggler-off className="d-none align-middle">
                <Icon icon="heart" className="text-muted" />
                Like
              </span>
            </span>
            <a href="" className="btn btn-sm fs-sm btn-link text-muted">
              <Icon icon="share" className="me-1" />
              Share
            </a>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pb-0">
          <div className="d-flex align-items-center">
            <img src={user6} className="avatar-sm rounded-circle me-2" alt="User" />

            <div className="flex-grow-1">
              <h5 className="fw-semibold mb-0">
                <Link to="" className="link-reset">
                  David Kim
                </Link>
              </h5>
              <small className="text-muted">10 hours ago</small>
            </div>

            <Dropdown className="ms-auto">
              <DropdownToggle as="a" className="text-muted drop-arrow-none card-drop p-0 content-none">
                <Icon icon="dots-vertical" className="fs-lg" />
              </DropdownToggle>
              <DropdownMenu align="end">
                <DropdownItem>
                  <Icon icon="edit" className="me-2" />
                  Edit Post
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="trash" className="me-2" />
                  Delete Post
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="share" className="me-2" />
                  Share
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="pin" className="me-2" />
                  Pin to Top
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="flag" className="me-2" />
                  Report Post
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>

          <div className="mt-3">
            <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill mb-2">📊 Community Poll</span>
            <h5 className="fw-bold mb-1">Choose your favorite front-end framework in 2025</h5>
            <p className="text-muted mb-2">Your vote helps us decide what to adopt for our next UI toolkit update.</p>
          </div>
        </CardBody>

        <div className="px-3 pb-3">
          <div className="bg-light-subtle p-3 ps-4 rounded-3 border">
            <form className="poll-form">
              <div className="form-check mb-2 p-2 card-bg rounded-3 shadow-sm">
                <input className="form-check-input" type="radio" name="poll" id="pollReact" />
                <label className="form-check-label fw-semibold" htmlFor="pollReact">
                  React (Meta)
                </label>
              </div>
              <div className="form-check mb-2 p-2 card-bg rounded-3 shadow-sm">
                <input className="form-check-input" type="radio" name="poll" id="pollVue" />
                <label className="form-check-label fw-semibold" htmlFor="pollVue">
                  Vue.js (Evan You)
                </label>
              </div>
              <div className="form-check mb-2 p-2 card-bg rounded-3 shadow-sm">
                <input className="form-check-input" type="radio" name="poll" id="pollAngular" />
                <label className="form-check-label fw-semibold" htmlFor="pollAngular">
                  Angular (Google)
                </label>
              </div>
              <div className="form-check mb-3 p-2 card-bg rounded-3 shadow-sm">
                <input className="form-check-input" type="radio" name="poll" id="pollSvelte" />
                <label className="form-check-label fw-semibold" htmlFor="pollSvelte">
                  Svelte (Emerging Favorite)
                </label>
              </div>

              <button type="submit" className="btn btn-primary w-100 rounded-pill">
                Submit Vote
              </button>
            </form>
          </div>
        </div>
      </Card>

      <Card>
        <CardBody className="pb-0 d-flex align-items-center">
          <img src={user7} alt="" className="avatar-sm rounded-circle me-2" />
          <div className="flex-grow-1">
            <h5 className="fw-semibold mb-0">
              <Link to="" className="link-reset">
                Ava Thompson
              </Link>
            </h5>
            <small className="text-muted">1 hour ago</small>
          </div>
          <Dropdown>
            <DropdownToggle as="a" className="text-muted drop-arrow-none card-drop p-0 content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="share" className="me-2" />
                Share
              </DropdownItem>
              <DropdownItem>
                <Icon icon="flag" className="me-2" />
                Report
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardBody>

        <div className="p-3 pb-0">
          <div className="rounded-4 overflow-hidden shadow-sm">
            <img src={gallery8} alt="" className="img-fluid w-100" style={{
            height: 260,
            objectFit: 'cover'
          }} />
          </div>
        </div>

        <div className="px-3 py-2">
          <p className="mb-2 text-muted">Dropping my favorite shot from yesterday's sunset hike. 🌅 Nature always surprises me.</p>
        </div>

        <div className="p-2">
          <a href="" className="btn btn-sm fs-sm btn-link text-muted">
            <Icon icon="corner-up-left" className="me-1" />
            Reply
          </a>
          <span className="btn btn-sm fs-sm btn-link text-muted" data-toggler="on">
            <span data-toggler-on className="align-middle">
              <Icon icon="heart-filled" className="text-danger" />
              Liked!
            </span>
            <span data-toggler-off className="d-none align-middle">
              <Icon icon="heart" className="text-muted" />
              Like
            </span>
          </span>
          <a href="" className="btn btn-sm fs-sm btn-link text-muted">
            <Icon icon="share" className="me-1" />
            Share
          </a>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="position-relative">
          <img src={gallery12} alt="" className="img-fluid w-100" style={{
          height: 200,
          objectFit: 'cover',
          filter: 'brightness(0.5)'
        }} />
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center text-center text-white px-4">
            <Icon icon="quote" className="fs-1 opacity-75 mb-2" />
            <h4 className="fw-bold mb-1">“Creativity is intelligence having fun.”</h4>
            <p className="small mb-0 opacity-75">A reminder to keep exploring, learning, and building.</p>
          </div>

          <Dropdown className="position-absolute top-0 end-0 m-3">
            <DropdownToggle as="a" className="text-muted drop-arrow-none card-drop p-0 content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="share" className="me-2" />
                Share
              </DropdownItem>
              <DropdownItem>
                <Icon icon="flag" className="me-2" />
                Report
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        <CardBody className="d-flex align-items-center">
          <img src={user4} alt="" className="avatar-md rounded-circle me-2" />
          <div className="flex-grow-1">
            <h5 className="fw-semibold mb-0">
              <Link to="" className="link-reset">
                Noah Carter
              </Link>
            </h5>
            <small className="text-muted">Shared an inspiration</small>
          </div>
          <span className="text-muted fs-xl" data-toggler="off">
            <span data-toggler-on className="d-none align-middle">
              <Icon icon="heart-filled" className="text-danger" />
            </span>
            <span data-toggler-off className="align-middle">
              <Icon icon="heart" className="text-muted" />
            </span>
          </span>
        </CardBody>
      </Card>
    </>;
};
export default FeedColumn;