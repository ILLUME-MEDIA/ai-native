import gallery10 from '@admin/assets/images/gallery/10.jpg';
import gallery2 from '@admin/assets/images/gallery/2.jpg';
import gallery3 from '@admin/assets/images/gallery/3.jpg';
import gallery5 from '@admin/assets/images/gallery/5.jpg';
import gallery7 from '@admin/assets/images/gallery/7.jpg';
import user1 from '@admin/assets/images/users/user-1.jpg';
import user10 from '@admin/assets/images/users/user-10.jpg';
import user2 from '@admin/assets/images/users/user-2.jpg';
import user3 from '@admin/assets/images/users/user-3.jpg';
import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import user6 from '@admin/assets/images/users/user-6.jpg';
import user8 from '@admin/assets/images/users/user-8.jpg';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Button, Card, CardBody, CardFooter, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, FormControl, Row } from 'react-bootstrap';
const SocialFeed = () => {
  return <>
     
        <Card>
          <CardBody>
            <h5 className="mb-2">What's on your mind?</h5>
            <form>
              <textarea rows={3} className="form-control" placeholder="Share your thoughts..." />
              <div className="d-flex pt-2 justify-content-between align-items-center">
                <div className="d-flex gap-1">
                  <Button size="sm" variant="light" className="btn-icon">
                    <Icon icon="user" className="fs-md" />
                  </Button>
                  <Button size="sm" variant="light" className="btn-icon">
                    <Icon icon="map-pin" className="fs-md" />
                  </Button>
                  <Button size="sm" variant="light" className="btn-icon">
                    <Icon icon="camera" className="fs-md" />
                  </Button>
                  <Button size="sm" variant="light" className="btn-icon">
                    <Icon icon="mood-smile" className="fs-md" />
                  </Button>
                </div>
                <Button variant="dark" size="sm" type="submit">
                  Post
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <h1 className="mb-2">🏆</h1>
            <h4 className="mb-1 fw-semibold">Congratulations, __username__! 🎉</h4>

            <p className="text-muted fst-italic mb-3">
              Congratulations! You’ve reached
              <strong>5,000 subscribers</strong>! Your community is growing fast!
            </p>

            <div className="d-flex justify-content-center mb-3">
              <div className="me-4 text-center">
                <h6 className="mb-0">Posts</h6>
                <span className="fw-bold">250</span>
              </div>
              <div className="me-4 text-center">
                <h6 className="mb-0">Likes</h6>
                <span className="fw-bold">15,200</span>
              </div>
              <div className="text-center">
                <h6 className="mb-0">Subscribers</h6>
                <span className="fw-bold">5,000</span>
              </div>
            </div>

            <button className="btn btn-sm btn-outline-success me-2">
              <Icon icon="share" className="me-1" />
              Share Achievement
            </button>
            <a href="#!" className="btn btn-sm btn-primary">
              <Icon icon="user" className="me-1" />
              View Profile
            </a>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="pb-2">
            <div className="d-flex align-items-center mb-2">
              <img className="me-2 avatar-md rounded-circle" src={user10} alt="Generic placeholder image" />
              <div className="w-100">
                <h5 className="m-0">
                  <a href="#!" className="link-reset">
                    Sophia Martinez
                  </a>
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
            <Row className="g-1">
              <Col md="6">
                <img src={gallery10} className="img-fluid w-100 h-100 rounded" style={{
              aspectRatio: '3/4',
              objectFit: 'cover'
            }} alt="Tall Image" />
              </Col>

              <Col md="6" className="d-flex flex-column gap-1">
                <img src={gallery2} className="img-fluid w-100 rounded" style={{
              aspectRatio: '4/3',
              objectFit: 'cover'
            }} alt="Top Right" />
                <img src={gallery3} className="img-fluid w-100 rounded" style={{
              aspectRatio: '4/3',
              objectFit: 'cover'
            }} alt="Bottom Right" />
              </Col>
            </Row>
            <div className="mt-2">
              <a href="" className="btn btn-sm fs-sm btn-link text-muted">
                <Icon icon="reply" className="me-1" />
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
          <CardBody className="pb-2">
            <div className="d-flex align-items-center mb-2">
              <img className="me-2 avatar-sm rounded-circle" src={user4} alt="Generic placeholder image" />
              <div className="w-100">
                <h5 className="m-0">
                  <Link to="" className="link-reset">
                    Liam Anderson
                  </Link>
                </h5>
                <p className="text-muted mb-0">
                  <small>about 30 minutes ago</small>
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
            <div className="fs-16 text-center mt-3 mb-4 fst-italic">
              <Icon icon="quote" className="fs-20" />
              Spent the weekend exploring the local trails! Captured some amazing nature shots and can’t wait to post them soon. 🌿📸
            </div>
            <div className="bg-light-subtle mx-n3 p-3 border-top border-bottom border-dashed">
              <div className="d-flex align-items-start">
                <img className="me-2 avatar-sm rounded-circle" src={user5} alt="Generic placeholder image" />
                <div className="w-100">
                  <h5 className="mt-0 mb-1">
                    <a href="#!" className="link-reset">
                      Ethan Reynolds
                    </a>
                    <small className="text-muted fw-normal float-end">20 minutes ago</small>
                  </h5>
                  Loved your recent project! Really curious to see how you implemented the animations.
                  <br />
                  <a href="" className="text-muted font-13 d-inline-block mt-2">
                    <Icon icon="corner-up-left" />
                    Reply
                  </a>
                  <div className="d-flex align-items-start mt-3">
                    <a className="pe-2" href="#">
                      <img src={user6} className="avatar-sm rounded-circle" alt="Generic placeholder image" />
                    </a>
                    <div className="w-100">
                      <h5 className="mt-0 mb-1">
                        <a href="#!" className="link-reset">
                          Mia Thompson
                        </a>
                        <small className="text-muted fw-normal float-end">12 minutes ago</small>
                      </h5>
                      I created something similar in Angular last month — would love to swap tips!
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-start mt-3">
                <a className="pe-2" href="#">
                  <img src={user3} className="rounded-circle" alt="Generic placeholder image" height={31} />
                </a>
                <div className="w-100">
                  <FormControl type="text" id="simpleinput" className="form-control-sm" placeholder="Add a comment..." />
                </div>
              </div>
            </div>
            <div className="mt-2">
              <a href="" className="btn btn-sm fs-sm btn-link text-muted">
                <Icon icon="corner-up-left" className="me-1" />
                Reply
              </a>
              <span className="btn btn-sm fs-sm btn-link text-muted" data-toggler="off">
                <span data-toggler-on className="d-none align-middle">
                  <Icon icon="heart-filled" className="text-danger" />
                  Liked!
                </span>
                <span data-toggler-off className="align-middle">
                  <Icon icon="heart" className="text-muted" />
                  Likes (45)
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
          <CardBody>
            <div className="d-flex align-items-center mb-3">
              <img className="me-2 avatar-sm rounded-circle" src={user2} alt="Profile photo of Anika Roy" />
              <div className="w-100">
                <h5 className="m-0">
                  <Link to="" className="link-reset">
                    Anika Roy
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

            <h5 className="mb-2">
              🌿 Save the Date:
              <strong>Nature Photography Workshop 2025</strong>
            </h5>
            <p className="text-muted mb-2">
              Join fellow creatives and outdoor enthusiasts for an inspiring weekend of nature photography tips, live field sessions, and community
              networking.
            </p>
            <ul className="list-unstyled mb-3">
              <li className="pb-2">
                <strong>Date:</strong>
                Saturday, 14th September 2025
              </li>
              <li className="pb-2">
                <strong>Time:</strong>
                10:00 AM – 4:00 PM
              </li>
              <li>
                <strong>Location:</strong>
                Green Valley National Park (Meeting point to be shared)
              </li>
            </ul>

            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-primary">
                <Icon icon="bell" className="me-1" />
                Interested
              </button>
              <button className="btn btn-sm btn-primary">
                <Icon icon="user-plus" className="me-1" />
                Join Now
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
                  <a href="#!" className="link-reset">
                    __username__
                  </a>
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
            <Row className="g-2">
              <Col md="6">
                <div className="ratio ratio-16x9 rounded overflow-hidden">
                  <iframe src="https://player.vimeo.com/video/1084537" allowFullScreen />
                </div>
              </Col>
              <Col md="6">
                <div className="ratio ratio-16x9 rounded overflow-hidden">
                  <iframe src="https://player.vimeo.com/video/76979871" allowFullScreen />
                </div>
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
        <Card>
          <CardBody>
            <div className="d-flex align-items-center mb-2">
              <img className="me-2 avatar-sm rounded-circle" src={user6} alt="Profile photo of David Kim" />
              <div className="w-100">
                <h5 className="m-0">
                  <a href="#!" className="link-reset">
                    David Kim
                  </a>
                </h5>
                <p className="text-muted mb-0">
                  <small>Posted 10 hours ago</small>
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

            <h5 className="mb-3">🔥 Quick Poll: What’s your go-to front-end framework in 2025?</h5>
            <p className="text-muted">We’re gathering developer preferences for our next project. Cast your vote below! 💻</p>

            <form>
              <div className="form-check mb-1">
                <input className="form-check-input" type="radio" name="framework_poll" id="optionReact" />
                <label className="form-check-label" htmlFor="optionReact">
                  React (Meta)
                </label>
              </div>
              <div className="form-check mb-1">
                <input className="form-check-input" type="radio" name="framework_poll" id="optionVue" />
                <label className="form-check-label" htmlFor="optionVue">
                  Vue.js (Evan You)
                </label>
              </div>
              <div className="form-check mb-1">
                <input className="form-check-input" type="radio" name="framework_poll" id="optionAngular" />
                <label className="form-check-label" htmlFor="optionAngular">
                  Angular (Google)
                </label>
              </div>
              <div className="form-check mb-3">
                <input className="form-check-input" type="radio" name="framework_poll" id="optionSvelte" />
                <label className="form-check-label" htmlFor="optionSvelte">
                  Svelte (Emerging Favorite)
                </label>
              </div>
              <button type="submit" className="btn btn-sm btn-primary">
                Submit Vote
              </button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="pb-2 d-flex align-items-center">
            <img src={user6} alt="Sarah Mitchell" className="avatar-md rounded-circle me-2" />
            <div className="flex-grow-1">
              <h5 className="fw-semibold mb-0">
                <a href="#!" className="link-reset">
                  Sarah Mitchell
                </a>
              </h5>
              <small className="text-muted">Posted 4 hours ago</small>
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
          </CardBody>

          <div className="px-3 pb-3">
            <div className="border rounded-3 p-3 bg-light-subtle">
              <h5 className="fw-bold mb-1">🌟 Hiring: Front-End Developer</h5>
              <p className="text-muted mb-3">Our team is growing! Looking for a talented developer experienced with modern JS frameworks.</p>
              <ul className="list-unstyled mb-3">
                <li>
                  <strong>Role:</strong> Front-End Developer
                </li>
                <li>
                  <strong>Skills:</strong> React, Vue, ESBuild, Tailwind
                </li>
                <li>
                  <strong>Location:</strong> Remote (Worldwide)
                </li>
              </ul>
              <button className="btn btn-primary w-100 rounded-pill">Apply Now</button>
            </div>
          </div>

          <CardFooter className="border-0 pt-0 d-flex gap-3">
            <div>
              <span className="btn btn-sm fs-sm btn-link text-muted" data-toggler="off">
                <span data-toggler-on className="d-none align-middle">
                  <Icon icon="heart-filled" className="text-danger" />
                  Saved!
                </span>
                <span data-toggler-off className="align-middle">
                  <Icon icon="heart" className="text-muted" />
                  Save
                </span>
              </span>
              <a href="" className="btn btn-sm fs-sm btn-link text-muted">
                <Icon icon="share" className="me-1" />
                Share
              </a>
            </div>
          </CardFooter>
        </Card>
        <Card>
          <CardBody className="pb-0 d-flex align-items-center">
            <img src={user3} alt="" className="avatar-md rounded-circle me-2" />
            <div className="flex-grow-1">
              <h5 className="fw-semibold mb-0">
                <Link to="" className="link-reset">
                  Daniel Carter
                </Link>
              </h5>
              <small className="text-muted">6 hours ago</small>
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
                  <Icon icon="flag" className="me-2" />
                  Report
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </CardBody>

          <div className="p-3 pb-1">
            <p className="text-muted mb-2">Found this helpful tool for UI designers — bookmarking it for future projects!</p>
            <a href="#!" className="d-block border border-light rounded-4 text-reset overflow-hidden shadow-sm">
              <div className="d-flex">
                <img src={gallery7} alt="" className="img-fluid" style={{
              width: 140,
              objectFit: 'cover'
            }} />
                <div className="p-3">
                  <h6 className="fw-bold mb-1">UI Component Library Explorer</h6>
                  <p className="small text-muted mb-0">Browse, compare and preview hundreds of UI components for modern frameworks.</p>
                </div>
              </div>
            </a>
          </div>

          <CardFooter className="border-0 pt-3 d-flex gap-2">
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
          </CardFooter>
        </Card>
        <Card>
          <CardBody className="pb-0 d-flex align-items-center">
            <img src={user10} alt="" className="avatar-md rounded-circle me-2" />
            <div className="flex-grow-1">
              <h5 className="fw-semibold mb-0">
                <Link to="" className="link-reset">
                  Evelyn Brooks
                </Link>
              </h5>
              <small className="text-muted">Just now</small>
            </div>
            <Dropdown>
              <DropdownToggle as="a" className="text-muted drop-arrow-none card-drop p-0 content-none">
                <Icon icon="dots-vertical" className="fs-lg" />
              </DropdownToggle>
              <DropdownMenu align="end">
                <DropdownItem>
                  <Icon icon="flag" className="me-2" />
                  Report
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </CardBody>

          <div className="px-3 pb-3 pt-2">
            <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-4 text-center">
              <h1 className="display-6 mb-0">🌤️</h1>
              <h3 className="fw-bold mb-2">23°C</h3>
              <p className="mb-0 fst-italic">
                Clear skies in <strong>Vancouver</strong>
              </p>
            </div>
            <p className="mt-3 text-muted text-center">Perfect weather for a walk by the water today 🌊✨</p>
          </div>

          <CardFooter className="border-0 pt-0 d-flex justify-content-center gap-2">
            <span className="btn btn-sm fs-sm btn-link text-muted" data-toggler="off">
              <span data-toggler-on className="align-middle">
                <Icon icon="heart-filled" className="text-danger" />
                Liked!
              </span>
              <span data-toggler-off className="d-none align-middle">
                <Icon icon="heart" className="text-muted" />
                Like
              </span>
            </span>
            <a href="#" className="btn btn-sm fs-sm btn-link text-muted">
              <Icon icon="corner-up-left" className="me-1" />
              Comment
            </a>
            <a href="#" className="btn btn-sm fs-sm btn-link text-muted">
              <Icon icon="share" className="me-1" />
              Share
            </a>
          </CardFooter>
        </Card>
        <Card>
          <CardBody className="pb-2 d-flex align-items-center">
            <img src={user8} alt="" className="avatar-sm rounded-circle me-2" />
            <div className="flex-grow-1">
              <h5 className="fw-semibold mb-0">
                <Link to="" className="link-reset">
                  Emma Wilson
                </Link>
              </h5>
              <small className="text-muted">3 hours ago</small>
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

          <div className="px-3">
            <h5 className="fw-bold mb-1 mt-3">🎧 Song of the Day</h5>
            <p className="text-muted mb-2">Found this calming track for focus sessions — highly recommend giving it a listen.</p>

            <div className="bg-light-subtle rounded-4 p-3 shadow-sm">
              <div className="d-flex align-items-center">
                <img src={gallery5} alt="Album cover" className="rounded me-3" style={{
              height: 60,
              width: 60,
              objectFit: 'cover'
            }} />
                <div className="flex-grow-1">
                  <div className="fw-semibold">Dreamscape Horizon</div>
                  <small className="text-muted">By SynthWaves</small>

                  <audio controls className="w-100 mt-2" style={{
                height: 32
              }}>
                    <source src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            </div>
          </div>

          <CardFooter className="border-0 d-flex gap-3">
            <div>
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
          </CardFooter>
        </Card>
     
    </>;
};
export default SocialFeed;